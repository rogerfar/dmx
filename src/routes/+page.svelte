<script lang="ts">
	import { dmx } from '#lib/dmx.svelte.ts';
	import { getFixtures } from '#lib/fixtures.remote.ts';
	import { getScenes } from '#lib/scenes.remote.ts';
	import { buildUniverse } from '#lib/universe.ts';

	let activeIds = $state<number[]>([]);
	const scenes = $derived(await getScenes());
	const fixtures = $derived(await getFixtures());
	const slots = $derived(Array.from({ length: 9 }, (_, i) => scenes.find((s) => s.slot === i)));

	// Active scenes are layered; where they overlap, the highest value per channel wins.
	function apply() {
		const out = new Uint8Array(512);
		for (const scene of scenes.filter((s) => activeIds.includes(s.id))) {
			const u = buildUniverse(scene.values, fixtures);
			for (let i = 0; i < 512; i++) out[i] = Math.max(out[i], u[i]);
		}
		dmx.set(out);
	}

	function toggle(scene: (typeof scenes)[number]) {
		activeIds = activeIds.includes(scene.id)
			? activeIds.filter((id) => id !== scene.id)
			: [...activeIds, scene.id];
		apply();
	}

	function blackout() {
		activeIds = [];
		dmx.blackout();
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-xl font-semibold">Program</h1>
	<button
		class="rounded bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
		onclick={blackout}>Blackout</button
	>
</div>

{#if dmx.status !== 'connected'}
	<p class="mb-4 rounded bg-amber-950 p-3 text-sm text-amber-300">
		No DMX device connected. <a href="/output" class="underline">Connect one</a> to send output.
	</p>
{/if}

<div class="grid aspect-square max-h-[75vh] grid-cols-3 gap-3">
	{#each slots as scene, i (i)}
		{#if scene}
			<button
				class="rounded-lg p-2 text-lg font-semibold transition {activeIds.includes(scene.id)
					? 'bg-amber-500 text-black'
					: 'bg-neutral-800 hover:bg-neutral-700'}"
				onclick={() => toggle(scene)}>{scene.name}</button
			>
		{:else}
			<a
				href="/scenes"
				class="flex items-center justify-center rounded-lg border border-dashed border-neutral-800 text-sm text-neutral-600"
				>Empty {i + 1}</a
			>
		{/if}
	{/each}
</div>

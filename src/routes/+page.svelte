<script lang="ts">
	import { dmx } from '#lib/dmx.svelte.ts';
	import { getFixtures } from '#lib/fixtures.remote.ts';
	import { getScenes } from '#lib/scenes.remote.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { buildUniverse } from '#lib/universe.ts';

	let activeId = $state<number | null>(null);
	let master = $state(100);
	const scenes = $derived(await getScenes());
	const fixtures = $derived(await getFixtures());
	const slots = $derived(
		Array.from({ length: settings.slotCount }, (_, i) => scenes.find((s) => s.slot === i))
	);

	function apply() {
		const scene = scenes.find((s) => s.id === activeId);
		if (!scene) return dmx.blackout();
		const universe = buildUniverse(scene.values, fixtures);
		for (let i = 0; i < 512; i++) universe[i] = Math.round((universe[i] * master) / 100);
		dmx.set(universe);
	}

	// Only one scene can be active; selecting it again turns it off.
	function toggle(scene: (typeof scenes)[number]) {
		activeId = activeId === scene.id ? null : scene.id;
		apply();
	}

	function blackout() {
		activeId = null;
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
		No DMX device connected. <a href="/settings" class="underline">Connect one</a> to send output.
	</p>
{/if}

<label class="mb-4 flex items-center gap-4 rounded-lg bg-neutral-900 p-4 text-sm">
	<span class="w-16 shrink-0 font-medium">Master</span>
	<input
		type="range"
		min="0"
		max="100"
		bind:value={master}
		oninput={apply}
		class="grow accent-amber-500"
	/>
	<span class="w-12 text-right tabular-nums">{master}%</span>
</label>

<div
	class="grid gap-3"
	style="grid-template-columns: repeat({settings.columns}, minmax(0, 1fr)); aspect-ratio: {settings.columns} / {settings.rows}; max-height: 75vh;"
>
	{#each slots as scene, i (i)}
		{#if scene}
			<button
				class="rounded-lg p-2 text-lg font-semibold transition {activeId === scene.id
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

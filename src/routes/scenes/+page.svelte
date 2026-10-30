<script lang="ts">
	import { getFixtures } from '#lib/fixtures.remote.ts';
	import { deleteScene, getScenes, saveScene } from '#lib/scenes.remote.ts';
	import { dmx } from '#lib/dmx.svelte.ts';
	import { settings } from '#lib/settings.svelte.ts';
	import { buildUniverse } from '#lib/universe.ts';

	const fixtures = $derived(await getFixtures());
	const scenes = $derived(await getScenes());

	let sceneId = $state<number | undefined>(undefined);
	let name = $state('');
	let slot = $state<number | null>(null);
	let included = $state<Record<number, boolean>>({});
	let levels = $state<Record<string, number>>({});
	let live = $state(false);
	let error = $state('');

	const key = (fixtureId: number, channel: number) => `${fixtureId}:${channel}`;

	function currentValues() {
		return fixtures
			.filter((f) => included[f.id])
			.flatMap((f) =>
				Array.from({ length: f.channelCount }, (_, c) => ({
					fixtureId: f.id,
					channel: c,
					value: levels[key(f.id, c)] ?? 0
				}))
			);
	}

	function preview() {
		dmx.set(buildUniverse(currentValues(), fixtures));
	}

	function newScene() {
		sceneId = undefined;
		name = '';
		slot = null;
		included = {};
		levels = {};
		error = '';
	}

	function load(s: (typeof scenes)[number]) {
		sceneId = s.id;
		name = s.name;
		slot = s.slot;
		included = {};
		levels = {};
		for (const v of s.values) {
			included[v.fixtureId] = true;
			levels[key(v.fixtureId, v.channel)] = v.value;
		}
		error = '';
		if (live) preview();
	}

	function changed() {
		if (live) preview();
	}

	async function save() {
		error = '';
		try {
			sceneId = await saveScene({ id: sceneId, name, slot, values: currentValues() });
		} catch (e) {
			error = (e as Error).message;
		}
	}

	async function remove() {
		if (sceneId === undefined || !confirm(`Delete scene "${name}"?`)) return;
		await deleteScene(sceneId);
		newScene();
	}
</script>

<div class="grid gap-6 md:grid-cols-[14rem_1fr]">
	<aside>
		<div class="mb-2 flex items-center justify-between">
			<h1 class="text-xl font-semibold">Scenes</h1>
			<button class="rounded bg-neutral-800 px-3 py-1 text-sm" onclick={newScene}>New</button>
		</div>
		<ul class="space-y-1">
			{#each scenes as s (s.id)}
				<li>
					<button
						class="flex w-full justify-between rounded px-3 py-2 text-left text-sm {sceneId === s.id
							? 'bg-amber-500 text-black'
							: 'bg-neutral-900 hover:bg-neutral-800'}"
						onclick={() => load(s)}
					>
						<span>{s.name}</span>
						<span class="opacity-60">{s.slot === null ? '' : `#${s.slot + 1}`}</span>
					</button>
				</li>
			{/each}
		</ul>
	</aside>

	<section class="space-y-4">
		<div class="flex flex-wrap items-end gap-3 rounded-lg bg-neutral-900 p-4">
			<label class="grow text-sm"
				>Scene name
				<input bind:value={name} class="mt-1 w-full rounded bg-neutral-800 p-2" />
			</label>
			<div class="text-sm">
				Program slot
				<div
					class="mt-1 grid gap-1"
					style="grid-template-columns: repeat({settings.columns}, minmax(0, 2rem));"
				>
					{#each Array.from({ length: settings.slotCount }, (_, i) => i) as i}
						<button
							type="button"
							class="size-8 rounded text-xs {slot === i
								? 'bg-amber-500 text-black'
								: 'bg-neutral-800 hover:bg-neutral-700'}"
							onclick={() => (slot = slot === i ? null : i)}>{i + 1}</button
						>
					{/each}
				</div>
			</div>
		</div>

		{#each fixtures as f (f.id)}
			<div class="rounded-lg bg-neutral-900 p-4">
				<label class="flex items-center gap-2 font-medium">
					<input type="checkbox" bind:checked={included[f.id]} onchange={changed} />
					{f.name}
					<span class="text-sm font-normal text-neutral-400">DMX {f.address}</span>
				</label>
				{#if included[f.id]}
					<div class="mt-3 space-y-2">
						{#each Array.from({ length: f.channelCount }, (_, c) => c) as c}
							<label class="flex items-center gap-3 text-sm">
								<span class="w-28 shrink-0 truncate text-neutral-400"
									>{f.channelLabels[c] || `Ch ${c + 1}`}</span
								>
								<input
									type="range"
									min="0"
									max="255"
									class="grow accent-amber-500"
									value={levels[key(f.id, c)] ?? 0}
									oninput={(e) => {
										levels[key(f.id, c)] = e.currentTarget.valueAsNumber;
										changed();
									}}
								/>
								<span class="w-8 text-right tabular-nums">{levels[key(f.id, c)] ?? 0}</span>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-neutral-500">Add fixtures first.</p>
		{/each}

		{#if error}<p class="text-sm text-red-400">{error}</p>{/if}

		<div class="flex flex-wrap items-center gap-2">
			<button
				class="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
				disabled={!name.trim()}
				onclick={save}>Save scene</button
			>
			<button
				class="rounded bg-neutral-800 px-4 py-2 text-sm"
				onclick={preview}>Preview</button
			>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={live} /> Live output
			</label>
			{#if sceneId !== undefined}
				<button class="ml-auto rounded bg-red-700 px-4 py-2 text-sm" onclick={remove}>Delete</button>
			{/if}
		</div>
	</section>
</div>

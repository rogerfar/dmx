<script lang="ts">
	import {
		addFixture,
		deleteFixture,
		getFixtures,
		updateFixture
	} from '#lib/fixtures.remote.ts';

	const fixtures = $derived(await getFixtures());

	let editingId = $state<number | null>(null);
	let name = $state('');
	let address = $state(1);
	let channelCount = $state(1);
	let labels = $state<string[]>([]);
	let error = $state('');

	function reset() {
		editingId = null;
		name = '';
		address = 1;
		channelCount = 1;
		labels = [];
		error = '';
	}

	function edit(f: (typeof fixtures)[number]) {
		editingId = f.id;
		name = f.name;
		address = f.address;
		channelCount = f.channelCount;
		labels = [...f.channelLabels];
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		const fixture = {
			name,
			address,
			channelCount,
			channelLabels: Array.from({ length: channelCount }, (_, i) => labels[i] ?? '')
		};
		try {
			if (editingId === null) await addFixture(fixture);
			else await updateFixture({ id: editingId, fixture });
			reset();
		} catch (err) {
			error = (err as Error).message;
		}
	}
</script>

<h1 class="mb-4 text-xl font-semibold">Fixtures</h1>

<form onsubmit={submit} class="mb-6 space-y-3 rounded-lg bg-neutral-900 p-4">
	<div class="grid grid-cols-3 gap-3">
		<label class="col-span-3 text-sm sm:col-span-1"
			>Name
			<input required bind:value={name} class="mt-1 w-full rounded bg-neutral-800 p-2" />
		</label>
		<label class="text-sm"
			>DMX address
			<input
				type="number"
				min="1"
				max="512"
				required
				bind:value={address}
				class="mt-1 w-full rounded bg-neutral-800 p-2"
			/>
		</label>
		<label class="text-sm"
			>Channels
			<input
				type="number"
				min="1"
				max="512"
				required
				bind:value={channelCount}
				class="mt-1 w-full rounded bg-neutral-800 p-2"
			/>
		</label>
	</div>

	{#if channelCount >= 1 && channelCount <= 32}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each Array.from({ length: channelCount }, (_, i) => i) as i}
				<input
					placeholder="Ch {i + 1} label"
					bind:value={labels[i]}
					class="rounded bg-neutral-800 p-2 text-sm"
				/>
			{/each}
		</div>
	{/if}

	{#if error}<p class="text-sm text-red-400">{error}</p>{/if}

	<div class="flex gap-2">
		<button class="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black">
			{editingId === null ? 'Add fixture' : 'Save'}
		</button>
		{#if editingId !== null}
			<button type="button" class="rounded bg-neutral-800 px-4 py-2 text-sm" onclick={reset}
				>Cancel</button
			>
		{/if}
	</div>
</form>

<ul class="space-y-2">
	{#each fixtures as f (f.id)}
		<li class="flex items-center justify-between rounded-lg bg-neutral-900 p-3">
			<div>
				<div class="font-medium">{f.name}</div>
				<div class="text-sm text-neutral-400">
					DMX {f.address}–{f.address + f.channelCount - 1} · {f.channelCount} ch
					{#if f.channelLabels.some(Boolean)}
						· {f.channelLabels.filter(Boolean).join(', ')}
					{/if}
				</div>
			</div>
			<div class="flex gap-2 text-sm">
				<button class="rounded bg-neutral-800 px-3 py-1" onclick={() => edit(f)}>Edit</button>
				<button
					class="rounded bg-red-700 px-3 py-1"
					onclick={() => confirm(`Delete ${f.name}?`) && deleteFixture(f.id)}>Delete</button
				>
			</div>
		</li>
	{:else}
		<li class="text-neutral-500">No fixtures yet.</li>
	{/each}
</ul>

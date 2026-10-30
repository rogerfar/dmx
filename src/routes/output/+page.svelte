<script lang="ts">
	import { dmx, PROTOCOLS } from '#lib/dmx.svelte.ts';

	let testChannel = $state(100);

	function test(value: number) {
		const universe = new Uint8Array(512);
		universe[testChannel - 1] = value;
		dmx.set(universe);
	}

	const hex = (n: number) => '0x' + n.toString(16).padStart(4, '0');
</script>

<h1 class="mb-4 text-xl font-semibold">DMX output</h1>

{#if !dmx.supported}
	<p class="rounded-lg bg-red-950 p-4 text-red-300">
		This browser has no WebUSB. Use Chrome or Edge (over https or localhost).
	</p>
{:else}
	<div class="space-y-4 rounded-lg bg-neutral-900 p-4">
		<div class="flex items-center gap-3">
			<span
				class="size-3 rounded-full {dmx.status === 'connected'
					? 'bg-green-500'
					: dmx.status === 'connecting'
						? 'bg-amber-500'
						: 'bg-neutral-600'}"
			></span>
			<span class="capitalize">{dmx.status}</span>
			<div class="ml-auto flex gap-2">
				{#if dmx.status === 'connected'}
					<button class="rounded bg-neutral-800 px-4 py-2 text-sm" onclick={() => dmx.disconnect()}
						>Disconnect</button
					>
				{:else}
					<button
						class="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black"
						onclick={() => dmx.connect()}>Connect USB device</button
					>
				{/if}
			</div>
		</div>

		{#if dmx.error}<p class="text-sm text-red-400">{dmx.error}</p>{/if}

		{#if dmx.info}
			<dl class="grid grid-cols-[8rem_1fr] gap-1 text-sm">
				<dt class="text-neutral-400">Device</dt>
				<dd>{dmx.info.name}</dd>
				<dt class="text-neutral-400">Manufacturer</dt>
				<dd>{dmx.info.manufacturer || '—'}</dd>
				<dt class="text-neutral-400">VID : PID</dt>
				<dd class="font-mono">{hex(dmx.info.vendorId)} : {hex(dmx.info.productId)}</dd>
				<dt class="text-neutral-400">Serial</dt>
				<dd class="font-mono">{dmx.info.serial || '—'}</dd>
				<dt class="text-neutral-400">Endpoints</dt>
				<dd class="font-mono">{dmx.info.interfaces.join(', ')}</dd>
			</dl>
		{/if}

		<div class="flex flex-wrap items-end gap-4 border-t border-neutral-800 pt-4 text-sm">
			<label class="grow"
				>Protocol
				<select bind:value={dmx.protocol} class="mt-1 w-full rounded bg-neutral-800 p-2">
					{#each Object.entries(PROTOCOLS) as [id, label] (id)}
						<option value={id}>{label}</option>
					{/each}
				</select>
			</label>
			<label
				>Channel
				<input
					type="number"
					min="1"
					max="512"
					bind:value={testChannel}
					class="mt-1 block w-20 rounded bg-neutral-800 p-2"
				/>
			</label>
			<button class="rounded bg-neutral-800 px-4 py-2" onclick={() => test(255)}>Test on</button>
			<button class="rounded bg-neutral-800 px-4 py-2" onclick={() => test(0)}>Off</button>
		</div>

		<p class="text-xs text-neutral-500">
			Switch protocol while connected and watch the console (F12) for each attempt. Test sets one
			channel to full; with a fixture on DMX 100, use channel 100.
		</p>
	</div>
{/if}

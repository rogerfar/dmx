<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { dmx } from '#lib/dmx.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/', label: 'Program' },
		{ href: '/scenes', label: 'Scenes' },
		{ href: '/fixtures', label: 'Fixtures' },
		{ href: '/output', label: 'Output' }
	];

	onMount(() => dmx.autoConnect());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>DMX</title>
</svelte:head>

<div class="min-h-screen bg-neutral-950 text-neutral-100">
	<nav class="flex gap-2 border-b border-neutral-800 p-3">
		{#each links as link}
			<a
				href={link.href}
				class="rounded px-4 py-2 text-sm font-medium {page.url.pathname === link.href
					? 'bg-amber-500 text-black'
					: 'bg-neutral-800 hover:bg-neutral-700'}">{link.label}</a
			>
		{/each}
		<span class="ml-auto flex items-center gap-2 text-sm text-neutral-400">
			<span
				class="size-2 rounded-full {dmx.status === 'connected' ? 'bg-green-500' : 'bg-neutral-600'}"
			></span>
			DMX
		</span>
	</nav>
	<main class="mx-auto max-w-4xl p-4">
		<svelte:boundary>
			{@render children()}
			{#snippet pending()}
				<p class="text-neutral-400">Loading…</p>
			{/snippet}
			{#snippet failed(error)}
				<p class="text-red-400">{(error as Error).message}</p>
			{/snippet}
		</svelte:boundary>
	</main>
</div>

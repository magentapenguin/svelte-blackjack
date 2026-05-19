<script lang="ts">
	import 'inter-ui/inter.css';
	import 'inter-ui/inter-variable.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script src="https://kit.fontawesome.com/4e3543c5e6.js" crossorigin="anonymous"></script>
</svelte:head>

{@render children()}


<style>

	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
	}
	:global(body) {
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		justify-content: center;
		font-family: 'Inter', sans-serif;
		background: #111;
	}
	@supports (font-variation-settings: normal) {
		:global(body) {
			font-family: 'Inter Variable', sans-serif;
		}
	}
	:global([hidden]) {
		display: none !important;
	}
</style>
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

<i data-fa-symbol="hearts" class="fa-solid fa-heart"></i>
<i data-fa-symbol="diamonds" class="fa-solid fa-diamond"></i>
<i data-fa-symbol="clubs" class="fa-solid fa-club"></i>
<i data-fa-symbol="spades" class="fa-solid fa-spade"></i>

<style>

	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100vh;
		overflow: hidden;
		width: 100vw;
	}
	:global(body) {
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		justify-content: center;
		--font: 'Inter', sans-serif;
		font-family: var(--font);
		background: radial-gradient(circle, #111, #000);
	}
	@supports (font-variation-settings: normal) {
		:global(body) {
			--font: 'Inter Variable', sans-serif;
		}
	}
	:global([hidden]) {
		display: none !important;
	}
</style>
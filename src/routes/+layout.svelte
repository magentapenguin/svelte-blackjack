<script lang="ts">
	import '$lib/themes.scss'
	import 'inter-ui/inter.css';
	import 'inter-ui/inter-variable.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Blackjack</title>
	<meta name="description" content="A simple blackjack game built with SvelteKit." />
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
		width: 100vw;
		overflow: hidden;
	}
	:global(html) {
		height: 100lvh;
		width: 100lvw;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		display: flex;
		height: 100vh;
		width: 100vw;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		--font-family: 'Inter', sans-serif;
		font-family: var(--font-family);
		background: radial-gradient(circle, var(--bg-1), var(--bg-2));
		color: var(--fg-1);
	}
	@supports (font-variation-settings: normal) {
		:global(body) {
			--font-family: 'Inter Variable', sans-serif;
		}
	}
	:global([hidden]) {
		display: none !important;
	}
</style>
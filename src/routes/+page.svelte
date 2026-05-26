<script lang="ts">
	import Card from '$lib/Card.svelte';
	import CardStack from '$lib/CardStack.svelte';
	import { onMount, tick } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import posthog from 'posthog-js';

	let cardDeck: { suit: string; value: number }[] = $state([]);

	function getRandomCard() {
		if (cardDeck.length === 0) {
			throw new Error('No more cards in the deck');
		}
		const index = Math.floor(Math.random() * cardDeck.length);
		return cardDeck.splice(index, 1)[0];
	}

	function calculateHandValue(hand: { suit: string; value: number; placeholder: boolean }[]) {
		let value = 0;
		let aces = 0;
		for (let card of hand) {
			if (card.placeholder) continue;
			if (card.value >= 11 && card.value <= 13) {
				value += 10;
			} else if (card.value === 1) {
				value += 11;
				aces++;
			} else {
				value += card.value;
			}
		}
		while (value > 21 && aces > 0) {
			value -= 10;
			aces--;
		}
		return value;
	}

	let playerCards: { suit: string; value: number; placeholder: boolean }[] = $state([]);
	let dealerCards: { suit: string; value: number; placeholder: boolean }[] = $state([]);
	let dealerScore = $derived(calculateHandValue(dealerCards));
	let playerScore = $derived(calculateHandValue(playerCards));
	let movingCards: {
		suit: string;
		value: number;
		x: number;
		y: number;
		to: 'player' | 'dealer';
		id: string;
	}[] = $state([]);

	let playerHand: HTMLElement | null = $state(null);
	let dealerHand: HTMLElement | null = $state(null);
	let deck: HTMLElement | null = $state(null);
	let playerCardSlots: (HTMLElement | null)[] = $state([]);
	let dealerCardSlots: (HTMLElement | null)[] = $state([]);
	let statusBg: HTMLElement | null = $state(null);

	async function drawCard(to: 'player' | 'dealer') {
		const card = getRandomCard();
		let index;
		if (to === 'player') {
			index = playerCards.push({ ...card, placeholder: true }) - 1;
		} else {
			index = dealerCards.push({ ...card, placeholder: true }) - 1;
		}
		await tick();
		if (!deck || !playerHand || !dealerHand) return;
		const deckRect = deck.getBoundingClientRect();
		const slot = to === 'player' ? playerCardSlots[index] : dealerCardSlots[index];
		const cardRect = slot?.querySelector('.card')?.getBoundingClientRect();
		const targetRect =
			cardRect ??
			slot?.getBoundingClientRect() ??
			(to === 'player' ? playerHand : dealerHand).getBoundingClientRect();

		const start = {
			x: deckRect.left + deckRect.width / 2,
			y: deckRect.top + deckRect.height / 2
		};
		let end = {
			x: targetRect.left + targetRect.width / 2,
			y: targetRect.top + targetRect.height / 2
		};

		const spring = new Spring(start, { stiffness: 0.5, damping: 0.9 });
		let id = crypto.randomUUID();
		movingCards.push({
			...card,
			x: start.x,
			y: start.y,
			to,
			id
		});
		let done = false;
		requestAnimationFrame(function animate() {
			if (!deck || !playerHand || !dealerHand) return;
			if (done) return;
			const { x, y } = spring.current;
			const movingCard = movingCards.find((c) => c.id === id);
			if (movingCard) {
				movingCard.x = x;
				movingCard.y = y;
			}
			requestAnimationFrame(animate);
		});
		await spring.set(end);
		done = true;
		if (to === 'player') {
			playerCards[index].placeholder = false;
		} else {
			dealerCards[index].placeholder = false;
		}
		movingCards = movingCards.filter((c) => c.id !== id);
	}

	function resetGame() {
		state = 'initial';
		playerWon = false;
		dealerWon = false;
		cardDeck = [];
		for (let suit of ['hearts', 'clubs', 'diamonds', 'spades']) {
			for (let value of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
				cardDeck.push({ suit, value });
			}
		}
		playerCards = [];
		dealerCards = [];
		movingCards = [];
	}

	let state: 'initial' | 'dealing' | 'player-turn' | 'dealer-turn' | 'game-over' =
		$state('initial');
	let dealerWon = $state(false);
	let playerWon = $state(false);
	let endStateColor = $derived(
		playerWon ? 'var(--green-dark)' : dealerWon ? 'var(--red-dark)' : 'var(--yellow-dark)'
	);

	async function hit() {
		if (state !== 'player-turn') return;
		posthog.capture('player_hit', { player_score: playerScore });
		state = 'dealing';
		await drawCard('player');
		state = 'player-turn';
		if (playerScore > 21) {
			await endGame();
		}
	}
	async function stand() {
		if (state !== 'player-turn') return;
		posthog.capture('player_stood', { player_score: playerScore });
		state = 'dealer-turn';
		while (dealerScore < 17) {
			await drawCard('dealer');
		}
		await endGame();
	}

	async function endGame() {
		state = 'game-over';
		let outcome = 'tie';
		if (dealerScore > 21 && playerScore > 21) {
			// both bust, tie
		} else if (dealerScore > 21) {
			playerWon = true;
			outcome = 'player_won';
		} else if (playerScore > 21) {
			dealerWon = true;
			outcome = 'dealer_won';
		} else if (playerScore === dealerScore) {
			// tie
		} else if (playerScore > dealerScore) {
			playerWon = true;
			outcome = 'player_won';
		} else {
			dealerWon = true;
			outcome = 'dealer_won';
		}
		posthog.capture('game_over', { outcome, player_score: playerScore, dealer_score: dealerScore });
		if (outcome === 'player_won') {
			stats.playerWins++;
		} else if (outcome === 'dealer_won') {
			stats.dealerWins++;
		} else {
			stats.ties++;
		}
		stats.gamesPlayed++;
		await tick();
		if (statusBg) {
			statusBg.animate(
				[
					{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
					{ opacity: 0.5, transform: 'translate(-50%, -50%) scale(1)' }
				],
				{
					duration: 1000,
					easing: 'ease-out',
					fill: 'forwards'
				}
			);
		}
	}

	function wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function dealInitialCards() {
		posthog.capture('game_started');
		state = 'dealing';
		await drawCard('player');
		await drawCard('dealer');
		await drawCard('player');
		await drawCard('dealer');
		state = 'player-turn';
		if (playerScore >= 21) {
			await endGame();
		} else if (dealerScore >= 21) {
			await endGame();
		}
	}

	async function newGame() {
		resetGame();
		await tick();
		await dealInitialCards();
	}

	let settings = $state({
		cardColor: 'purple',
		theme: 'dark',
		stats: false
	});

	let stats = $state({
		gamesPlayed: 0,
		playerWins: 0,
		dealerWins: 0,
		ties: 0
	});
	let percentageStats = $derived.by(() => {
		const { gamesPlayed, playerWins, dealerWins, ties } = stats;
		return {
			playerWinPercentage: gamesPlayed ? Math.round((playerWins / gamesPlayed) * 100) : 0,
			dealerWinPercentage: gamesPlayed ? Math.round((dealerWins / gamesPlayed) * 100) : 0,
			tiePercentage: gamesPlayed ? Math.round((ties / gamesPlayed) * 100) : 0
		};
	});

	onMount(() => {
		let localSettings = localStorage.getItem('blackjackSettings');
		if (localSettings) {
			// Merge local settings with defaults to allow for new settings to be added without breaking old ones
			settings = { ...settings, ...JSON.parse(localSettings) };
		}
		let localStats = localStorage.getItem('blackjackStats');
		if (localStats) {
			stats = { ...stats, ...JSON.parse(localStats) };
		}
		$effect(() => {
			localStorage.setItem('blackjackSettings', JSON.stringify(settings));
		});
		$effect(() => {
			localStorage.setItem('blackjackStats', JSON.stringify(stats));
		});
		addEventListener('storage', (e) => {
			if (e.key === 'blackjackSettings' && e.newValue) {
				settings = { ...settings, ...JSON.parse(e.newValue) };
			} else if (e.key === 'blackjackStats' && e.newValue) {
				stats = { ...stats, ...JSON.parse(e.newValue) };
			}
		});
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', settings.theme);
	});

	resetGame();

	// Initial deal
	onMount(dealInitialCards);
</script>

<div class="game">
	<button
		bind:this={deck}
		class="deck"
		onclick={hit}
		style="cursor: pointer; background: none; border: none; padding: 0;"
	>
		<CardStack color={settings.cardColor} dark={settings.darkMode} cards={cardDeck} />
	</button>

	<div class="score dealer" style:color={dealerScore > 21 ? 'red' : 'var(--fg-1)'}>
		{dealerScore}
	</div>
	<div class="score player" style:color={playerScore > 21 ? 'red' : 'var(--fg-1)'}>
		{playerScore}
	</div>

	<div class="hand player" bind:this={playerHand}>
		{#each playerCards as card, i (`player-${card.suit}-${card.value}-${i}`)}
			<div class="card-slot" bind:this={playerCardSlots[i]}>
				<Card
					suit={card.suit}
					number={card.value}
					placeholder={card.placeholder}
					flipped={!card.placeholder}
					color={settings.cardColor}
				/>
			</div>
		{/each}
	</div>

	<div class="hand dealer" bind:this={dealerHand}>
		{#each dealerCards as card, i (`dealer-${card.suit}-${card.value}-${i}`)}
			<div class="card-slot" bind:this={dealerCardSlots[i]} style="transform: rotate(-180deg);">
				<Card
					suit={card.suit}
					number={card.value}
					placeholder={card.placeholder}
					flipped={!card.placeholder}
					color={settings.cardColor}
				/>
			</div>
		{/each}
	</div>
	{#if state === 'game-over'}
		<div class="status" style:--color={endStateColor}>
			{#if playerWon}
				You win!
			{:else if dealerWon}
				Dealer wins!
			{:else}
				Tie!
			{/if}
		</div>
	{/if}
	<div class="controls" style="color: var(--fg-2); font-weight: 600;">
		{#if state === 'dealing'}
			Dealing cards...
		{:else if state === 'player-turn'}
			<button onclick={hit} style:--color="var(--primary)" class="button">Hit</button>
			<button onclick={stand} style:--color="var(--secondary)" class="button">Stand</button>
		{:else if state === 'dealer-turn'}
			Dealer's turn...
		{:else if state === 'game-over'}
			<button
				onclick={newGame}
				style:--color={playerWon
					? 'var(--green-muted)'
					: dealerWon
						? 'var(--red-muted)'
						: 'var(--yellow-muted)'}
				class="button">New Game</button
			>
		{/if}
	</div>
</div>
{#each movingCards as card, i (`moving-${card.suit}-${card.value}-${i}`)}
	<div
		class="moving-card"
		style="position: fixed; left: {card.x}px; top: {card.y}px; transform: translate(-50%, -50%); pointer-events: none; z-index: 500;"
	>
		<Card suit={card.suit} number={card.value} color={settings.cardColor} />
	</div>
{/each}

{#if state === 'game-over'}
	<div class="status-bg" bind:this={statusBg} style:--color={endStateColor}></div>
{/if}
<button
	onclick={() => replaceState('', { settings: true })}
	style="position: fixed; top: 15px; left: 15px; z-index: 998; background: none; border: none; padding: 0; font-size: 1.5em; cursor: pointer; color: var(--fg-1);"
	title="Settings"
>
	<i class="fa-solid fa-gear"></i>
</button>



{#if settings.stats}
	<div class="stats">
		<p style="color:var(--fg-1);">Games Played: {stats.gamesPlayed}</p>
		<p style="color:var(--green);">Player Wins: {stats.playerWins} ({percentageStats.playerWinPercentage}%)</p>
		<p style="color:var(--red);">Dealer Wins: {stats.dealerWins} ({percentageStats.dealerWinPercentage}%)</p>
		<p style="color:var(--yellow);">Ties: {stats.ties} ({percentageStats.tiePercentage}%)</p>
	</div>
{/if}

<svelte:head>
	<meta name="color-scheme" content={settings.darkMode ? 'dark' : 'light'} />
</svelte:head>

<div class="dialog settings" hidden={!page.state.settings}>
	<h2 style="margin-top: 0;">
		Settings
		<button
			onclick={() => replaceState('', { settings: false })}
			style="background: none; border: none; padding: 0; cursor: pointer; position: absolute; top: 15px; right: 15px; font-size: 1em; color: var(--fg-1);"
			title="Close"
		>
			<i class="fa-solid fa-xmark"></i>
		</button>
	</h2>
	<div
		style="display: grid; gap: 1em; grid-template-columns: max-content 1fr; align-items: center; overflow-y: auto;"
	>
		<span>Card Color:</span>
		<div class="button-group">
			{#each Object.entries( { blue: 'var(--blue)', green: 'var(--green)', red: 'var(--red)', purple: 'var(--purple)', yellow: 'var(--yellow)' } ) as [name, value]}
				<label class="button" style="--color: {value}; margin-right: 0.5em; cursor: pointer;">
					<input
						type="radio"
						name="color"
						class="checkbox"
						value={name}
						bind:group={settings.cardColor}
						hidden
						onchange={() =>
							posthog.capture('settings_changed', { setting: 'card_color', value: name })}
					/>
					{name.charAt(0).toUpperCase() + name.slice(1)}
				</label>
			{/each}
		</div>
		<span> Theme: </span>
		<div class="button-group">
			{#each Object.entries({ light: 'Light', dark: 'Dark', oled: 'OLED' }) as [name, label]}
				<label
					class="button"
					style="background: var(--bg-1); color: var(--fg-1); margin-right: 0.5em; cursor: pointer;"
					data-theme={name}
				>
					<input
						type="radio"
						name="theme"
						class="checkbox"
						value={name}
						bind:group={settings.theme}
						hidden
						onchange={() => posthog.capture('settings_changed', { setting: 'theme', value: name })}
					/>
					{label}
				</label>
			{/each}
		</div>
		<label for="stats"> Show Stats: </label>
		<div style="display: flex; align-items: center; gap: 0.5em;">
			<input
				type="checkbox"
				id="stats"
				class="checkbox"
				bind:checked={settings.stats}
				onchange={() => posthog.capture('settings_changed', { setting: 'show_stats', value: settings.stats })}
				style="width: 1.5em; height: 1.5em; cursor: pointer;"
			/>
			<button
				onclick={() => stats = { gamesPlayed: 0, playerWins: 0, dealerWins: 0, ties: 0 }}
				class="button"
				style="--color: var(--red); font-size: 0.9em; padding: 0.25em 0.5em;"
				title="Reset Stats"
			>
				Reset
			</button>
		</div>
	</div>
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="dialog-bg"
	hidden={!page.state.settings}
	style="position: fixed; top: 0; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999;"
	onclick={() => replaceState('', { settings: false })}
></div>

<style>
	.stats {
		position: fixed;
		bottom: 20px;
		left: 20px;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stats p {
		margin: 0;
	}
	.deck {
		position: absolute;
		top: 50%;
		right: 20px;
		transform: translateY(-50%);
	}
	.deck:hover {
		filter: brightness(105%);
	}
	.button-group {
		display: flex;
		flex-wrap: wrap;
	}
	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		margin: auto;
		min-height: 500px;
		width: 80vw;
		max-height: 80vh;
		background: var(--bg-2);
		border-radius: 8px;
		padding: 20px;
		z-index: 1000;
		border: 1px solid var(--fg-3);
		box-shadow: 0 0 10px #0003;
	}
	.checkbox {
		width: 1.2em;
		height: 1.2em;
	}
	.game {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		overflow: hidden;
		position: relative;
		width: 100vw;
	}
	.hand {
		position: absolute;
		display: flex;
		gap: 10px;
		margin-block: 20px;
		padding: 10px;
		border-radius: 8px;
		left: 50%;
		transform: translateX(-50%);
	}
	.player {
		bottom: 20px;
	}
	.dealer {
		top: 20px;
	}
	.score {
		font-size: 1.5em;
		text-shadow: 0 0 5px gray;
		position: absolute;
	}
	.button {
		font: inherit;
		font-family: var(--font);
		padding: 0.5em 1em;
		border: none;
		border-radius: 5px;
		background: color-mix(in srgb, var(--color), transparent 75%);
		color: color-mix(in srgb, var(--fg-color, var(--color)), var(--fg-1) 60%);
		cursor: pointer;
		font-weight: 600;
	}
	@property --color {
		syntax: '<color>';
		inherits: true;
		initial-value: #08f;
	}
	.button:has(.checkbox:checked) {
		background: color-mix(in srgb, var(--color), transparent 50%);
	}
	.button:hover {
		background: color-mix(in srgb, var(--color), transparent 60%);
	}
	.status {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color), white 50%) 0%,
			var(--color) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		font-weight: 700;
		text-align: center;
		font-size: 5em;
	}
	.status-bg {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100vw;
		height: 100vh;
		background: radial-gradient(circle, var(--color) 0%, transparent 50%);
		pointer-events: none;
	}
	@media (max-width: 600px) {
		.card-slot {
			width: 50px;
		}
		:global(.hand:has(.card-slot:nth-child(n + 4)) .card-slot) {
			width: 40px;
		}
		:global(.hand:has(.card-slot:nth-child(n + 6)) .card-slot) {
			width: 20px;
		}
		.deck {
			right: -65px;
			transform: translateY(-50%);
		}
		.status {
			font-size: 3em;
		}
	}
	@media (max-height: 600px) {
		.card-slot {
			height: 50px;
		}
		.score {
			margin-block: 25vh;
		}
		.status {
			font-size: 2em;
		}
	}
</style>

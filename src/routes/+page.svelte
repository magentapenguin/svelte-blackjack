<script lang="ts">
	import Card from '$lib/Card.svelte';
	import CardStack from '$lib/CardStack.svelte';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { draw } from 'svelte/transition';

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
	let endStateColor = $derived(playerWon ? '#4f4' : dealerWon ? '#f44' : '#ff4');

	async function hit() {
		if (state !== 'player-turn') return;
		state = 'dealing';
		await drawCard('player');
		state = 'player-turn';
		if (playerScore >= 21) {
			await endGame();
		}
	}
	async function stand() {
		if (state !== 'player-turn') return;
		state = 'dealer-turn';
		while (dealerScore < 17) {
			await drawCard('dealer');
		}
		await endGame();
	}

	async function endGame() {
		state = 'game-over';
		if (dealerScore > 21 && playerScore > 21) {
			// both bust, tie
		} else if (dealerScore > 21) {
			playerWon = true;
		} else if (playerScore > 21) {
			dealerWon = true;
		} else if (playerScore === dealerScore) {
			// tie
		} else if (playerScore > dealerScore) {
			playerWon = true;
		} else {
			dealerWon = true;
		}
		await tick();
		if (statusBg) {
			statusBg.animate(
				[
					{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
					{ opacity: 0.2, transform: 'translate(-50%, -50%) scale(1)' }
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

	let cardColor = 'purple';

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
		<CardStack color={cardColor} cards={cardDeck} />
	</button>

	<div class="score dealer" style:color={dealerScore > 21 ? 'red' : 'white'}>{dealerScore}</div>
	<div class="score player" style:color={playerScore > 21 ? 'red' : 'white'}>{playerScore}</div>

	<div class="hand player" bind:this={playerHand}>
		{#each playerCards as card, i (`player-${card.suit}-${card.value}-${i}`)}
			<div class="card-slot" bind:this={playerCardSlots[i]}>
				<Card
					suit={card.suit}
					number={card.value}
					placeholder={card.placeholder}
					flipped={!card.placeholder}
					color={cardColor}
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
					color={cardColor}
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
	<div class="controls" style="color: white; font-weight: 600;">
		{#if state === 'dealing'}
			Dealing cards...
		{:else if state === 'player-turn'}
			<button onclick={hit} style:--color="#080">Hit</button>
			<button onclick={stand} style:--color="#088">Stand</button>
		{:else if state === 'dealer-turn'}
			Dealer's turn...
		{:else if state === 'game-over'}
			<button onclick={newGame} style:--color={playerWon ? '#484' : dealerWon ? '#a44' : '#884'}
				>New Game</button
			>
		{/if}
	</div>
</div>
{#each movingCards as card, i (`moving-${card.suit}-${card.value}-${i}`)}
	<div
		class="moving-card"
		style="position: fixed; left: {card.x}px; top: {card.y}px; transform: translate(-50%, -50%); pointer-events: none; z-index: 1000;"
	>
		<Card suit={card.suit} number={card.value} color={cardColor} />
	</div>
{/each}

{#if state === 'game-over'}
	<div class="status-bg" bind:this={statusBg} style:--color={endStateColor}></div>
{/if}

<style>
	.deck {
		position: absolute;
		top: 50%;
		right: 20px;
		transform: translateY(-50%);
	}
	.game {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		overflow: hidden;
		position: relative;
		width:  100vw;
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
		color: white;
		text-shadow: 0 0 5px black;
		position: absolute;
	}
	button {
		font: inherit;
		padding: 0.5em 1em;
		border: none;
		border-radius: 5px;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color), white 20%) 0%,
			color-mix(in srgb, var(--color), black 20%) 100%
		);
		color: white;
		cursor: pointer;
		font-weight: 500;
	}
	@media (pointer: coarse) {
		button {
			padding: 1em 2em;
			font-size: 1.2em;
		}
	}
	@property --color {
		syntax: '<color>';
		inherits: true;
		initial-value: #08f;
	}
	button:hover {
		filter: brightness(120%);
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
		width: min(80vw, 80vh);
		height: min(80vw, 80vh);
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
	@media (max-height: 500px) {
		.card-slot {
			height: 50px;
		}
		.score {
			margin-block: 25vh;
		}
	}
</style>

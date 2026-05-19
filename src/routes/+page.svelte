<script lang="ts">
	import Card from '$lib/Card.svelte';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import { Spring } from 'svelte/motion';

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
	let movingCards: { suit: string; value: number; x: number; y: number; to: 'player' | 'dealer' }[] = $state([]);

	let playerHand: HTMLElement | null = $state(null);
	let dealerHand: HTMLElement | null = $state(null);
	let deck: HTMLElement | null = $state(null);
	let playerCardSlots: (HTMLElement | null)[] = $state([]);
	let dealerCardSlots: (HTMLElement | null)[] = $state([]);

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
		const targetRect = slot?.getBoundingClientRect() ?? (to === 'player' ? playerHand : dealerHand).getBoundingClientRect();

		const start = {
			x: deckRect.left + deckRect.width / 2,
			y: deckRect.top + deckRect.height / 2,
		};
		const end = {
			x: targetRect.left + targetRect.width / 2,
			y: targetRect.top + targetRect.height / 2,
		};

		const spring = new Spring(start, { stiffness: 0.1, damping: 0.3 });
		let moving_index = movingCards.push({
			...card,
			x: start.x,
			y: start.y,
			to,
		}) - 1;
		const movingCard = movingCards[moving_index];
		if (!movingCard) return;
		// Animate the card moving from the deck to the target hand
		let done = false;
		requestAnimationFrame(function animate() {
			if (done) return;
			movingCard.x = spring.current.x;
			movingCard.y = spring.current.y;
			requestAnimationFrame(animate);
		});
		await spring.set(end);
		done = true;
		if (to === 'player') {
			playerCards[index].placeholder = false;
		} else {
			dealerCards[index].placeholder = false;
		}
		movingCards.splice(moving_index, 1);
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

	let state: 'initial' | 'dealing' | 'player-turn' | 'dealer-turn' | 'game-over' = $state('initial');
	let dealerWon = $state(false);
	let playerWon = $state(false);

	async function hit() {
		if (state !== 'player-turn') return;
		state = 'dealing';
		await drawCard('player');
		state = 'player-turn';
		if (playerScore > 21) {
			state = 'game-over';
			dealerWon = true;
		} else if (playerScore === 21) {
			state = 'game-over';
			playerWon = true;
		}
	}
	async function stand() {
		if (state !== 'player-turn') return;
		state = 'dealer-turn';
		while (dealerScore < 17) {
			await drawCard('dealer');
		}
		state = 'game-over';
		if (dealerScore > 21 || playerScore > dealerScore) {
			playerWon = true;
		} else if (dealerScore > playerScore) {
			dealerWon = true;
		}
	}

	async function dealInitialCards() {
		state = 'dealing';
		await drawCard('player');
		await drawCard('dealer');
		await drawCard('player');
		await drawCard('dealer');
		state = 'player-turn';
		if (playerScore === 21) {
			state = 'game-over';
			playerWon = true;
		} else if (dealerScore === 21) {
			state = 'game-over';
			dealerWon = true;
		} else if (dealerScore > 21) {
			state = 'game-over';
			playerWon = true;
		} else if (playerScore > 21) {
			state = 'game-over';
			dealerWon = true;
		}
	}

	async function newGame() {
		resetGame();
		await tick();
		await dealInitialCards();
	}

	let cardColor = "purple";

	resetGame();

	// Initial deal
	onMount(dealInitialCards);
</script>

<div class="game">
	<button bind:this={deck} class="deck" onclick={hit} style="cursor: pointer; background: none; border: none; padding: 0;">
		<Card suit="hearts" number={2} color={cardColor} />
	</button>

	<div class="score dealer" style:color={dealerScore > 21 ? 'red' : 'white'}>{dealerScore}</div>
	<div class="score player" style:color={playerScore > 21 ? 'red' : 'white'}>{playerScore}</div>

	<div class="hand player" bind:this={playerHand}>
		{#each playerCards as card, i (`player-${card.suit}-${card.value}-${i}`)}
			<div class="card-slot" bind:this={playerCardSlots[i]}>
				<Card suit={card.suit} number={card.value} placeholder={card.placeholder} flipped={!card.placeholder} color={cardColor} />
			</div>
		{/each}
	</div>

	<div class="hand dealer" bind:this={dealerHand}>
		{#each dealerCards as card, i (`dealer-${card.suit}-${card.value}-${i}`)}
			<div class="card-slot" bind:this={dealerCardSlots[i]}  style="transform: rotate(-180deg);">
				<Card suit={card.suit} number={card.value} placeholder={card.placeholder} flipped={!card.placeholder} color={cardColor} />
			</div>
		{/each}
	</div>
	{#if state === 'game-over'}
		<div class="status" style:--color={playerWon ? '#4f4' : dealerWon ? '#f44' : '#ff4'} style="font-size: 5em">
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
			<button onclick={newGame} style:--color={playerWon ? '#4f4' : dealerWon ? '#f44' : '#ff4'}>New Game</button>
		{/if}
	</div>
</div>
{#each movingCards as card, i (`moving-${card.suit}-${card.value}-${i}`)}
	<div class="moving-card" style="position: fixed; left: {card.x}px; top: {card.y}px; transform: translate(-50%, -50%); pointer-events: none; z-index: 1000;">
		<Card
			suit={card.suit}
			number={card.value}
			color={cardColor}
		/>
	</div>
{/each}

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
		background: linear-gradient(180deg, color-mix(in srgb, var(--color), white 20%) 0%, color-mix(in srgb, var(--color), black 20%) 100%);
		color: white;
		cursor: pointer;
		font-weight: 500;
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
		background: linear-gradient(180deg, color-mix(in srgb, var(--color), white 50%) 0%, var(--color) 100%);
		-webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
		font-weight: 700;
	}
</style>

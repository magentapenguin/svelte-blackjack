<script lang="ts">
    let { 
        flipped = false,
        suit,
        number,
        color = "blue",
        placeholder = false,
        hidden = false,
        toponly = false,
        dark = false,
    }: {
        flipped?: boolean,
        suit: "hearts" | "diamonds" | "clubs" | "spades",
        number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "J" | "Q" | "K" | "A" | 11 | 12 | 13,
        color?: "blue" | "green" | "purple" | "red" | "yellow",
        placeholder?: boolean,
        hidden?: boolean,
        toponly?: boolean,
        dark?: boolean,
    } = $props();
    const suits = {
        hearts: '<svg><use href="#hearts"></use></svg>',
        diamonds: '<svg><use href="#diamonds"></use></svg>',
        clubs: '<svg><use href="#clubs"></use></svg>',
        spades: '<svg><use href="#spades"></use></svg>',
    }
    let suitColors = $dervied(!dark ?
	{
        hearts: "#c00",
        diamonds: "#c00",
        clubs: "#000",
        spades: "#000",
    } : {
        hearts: "#faa",
        diamonds: "#faa",
        clubs: "#fff",
        spades: "#fff",
    })
    
    const mapping = {
        "J": 11,
        "Q": 12,
        "K": 13,
        "A": 1,
    }
    const inverseMapping = Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]));
    const value = $derived(typeof number === "number" ? number : mapping[number]) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
    const icons = $derived({
        1: suits[suit],
        2: suits[suit].repeat(2),
        3: suits[suit].repeat(3),
        4: suits[suit].repeat(4),
        5: suits[suit].repeat(5),
        6: suits[suit].repeat(6),
        7: suits[suit].repeat(7),
        8: suits[suit].repeat(8),
        9: suits[suit].repeat(9),
        10: suits[suit].repeat(10),
        11: 'Jack', // couldn't find a good icon for face cards, so just using text
        12: 'Queen',
        13: 'King',
    });
    const colors = {
        blue: {
            "--bg-2": "#08c",
            "--bg-3": "#06a",
        },
        green: {
            "--bg-2": "#086",
            "--bg-3": "#064",
        },
        purple: {
            "--bg-2": "#80c",
            "--bg-3": "#60a",
        },
        red: {
            "--bg-2": "#c00",
            "--bg-3": "#a00",
        },
        yellow: {
            "--bg-2": "#cc0",
            "--bg-3": "#aa0",
        },
    }
    let style = $derived(colors[color]);
</script>
<div 
    class={["container", { dark }]}
    style={
        Object.entries(style).map(([key, value]) => `${key}: ${value}`).join("; ")
    }
    hidden={hidden}
>
    <div
        class={["card", { flipped }]}
        style={placeholder ? "opacity: 0.5; filter: grayscale(100%) brightness(50%);" : ""}
    >
    {#if !toponly}
        <div class="front" hidden={placeholder}>
            <div class="symbol" style="color: {suitColors[suit]}">
                {inverseMapping[value] ?? value}
                {@html suits[suit]}
            </div>
            <div class="value" style="color: {suitColors[suit]}">
                {@html icons[value]}
            </div>
            <div class="invert-symbol" style="color: {suitColors[suit]}">
                {inverseMapping[value] ?? value}
                {@html suits[suit]}
            </div>
        </div>
    {/if}
        <div class="back">
            <div class="pattern"></div>
        </div>
    </div>
</div>


<style>
	.container {
        --bg-1: #eee;
        --fg-1: #000;
        --fg-2: #333;
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
		justify-content: center;
		perspective: 100vh;
	}

    .dark.container {
        --bg-1: #222;
        --fg-1: #fff;
        --fg-2: #ccc;
    }

	.card {
		position: relative;
		aspect-ratio: 2.5 / 3.5;
		font-size: min(1vh, 0.25rem);
		height: 40em;
		background: var(--bg-1);
		border-radius: 2em;
		transform: rotateY(180deg);
		transition: transform 0.2s;
		transform-style: preserve-3d;
		padding: 0;
		user-select: none;
        border: none;
	}

	.card.flipped {
		transform: rotateY(0);
	}

	.front, .back {
		display: flex;
		align-items: center;
		justify-content: center;
		position: absolute;
		width: 100%;
		height: 100%;
		left: 0;
		top: 0;
		backface-visibility: hidden;
		border-radius: 2em;
		border: 1px solid var(--fg-2);
		box-sizing: border-box;
		padding: 1em;
	}

	.back {
		transform: rotateY(180deg);
	}

    .value {
        font-size: 6em;
        text-align: center;
        vertical-align: middle;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.1em;
    }

	.symbol {
        position: absolute;
        top: 0.5em;
        left: 0.5em;
        font-size: 1rem;
	}
    .invert-symbol {
        position: absolute;
        bottom: 0.5em;
        right: 0.5em;
        font-size: 1rem;
        transform: rotate(180deg);
    }

	.pattern {
		width: 100%;
		height: 100%;
		background-color: var(--bg-2);
		/* pattern from https://projects.verou.me/css3patterns/#marrakesh */
		background-image:
		radial-gradient(var(--bg-3) 0.9em, transparent 1em),
		repeating-radial-gradient(var(--bg-3) 0, var(--bg-3) 0.4em, transparent 0.5em, transparent 2em, var(--bg-3) 2.1em, var(--bg-3) 2.5em, transparent 2.6em, transparent 5em);
		background-size: 3em 3em, 9em 9em;
		background-position: 0 0;
		border-radius: 1em;
	}
    :global(svg) {
        width: 1em;
        height: 1em;
        vertical-align: -0.125em;
    }
</style>

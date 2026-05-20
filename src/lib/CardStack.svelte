<script lang="ts">
    import Card from '$lib/Card.svelte';
    let { cards = [], color }: { cards: { suit: string; value: number }[]; color: string } = $props();
</script>

<div class="stack" style:--card-count={cards.length}>
    {#each cards as card, i}
        <div style="position: absolute; top: 0; left: 0; transform: translateZ({-i * 0.5}em);">
            <Card suit={card.suit} number={card.value} color={color} toponly />
        </div>
    {/each}
</div>

<style>
    .stack {
        position: relative;
        width: 100px;
        height: 140px;
        transition: transform 0.3s;
        transform-style: preserve-3d;
        perspective: 1000px;
        transform: rotateX(7deg);
    }
    .stack:hover {
        transform: rotateX(10deg);
    }
</style>
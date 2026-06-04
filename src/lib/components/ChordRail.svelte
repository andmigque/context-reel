<script lang="ts">
	import { onMount } from 'svelte';
	import { CHORD_BINDINGS } from '$lib/chords/registry';
	import type { ChordBinding } from '$lib/types';

	// The rail reads the chord set through the seam (/api/chords), never a literal
	// baked into this template. The inline registry is the fallback if the fetch
	// fails, so the rail is never empty.
	let bindings = $state<ChordBinding[]>(CHORD_BINDINGS);

	onMount(async () => {
		try {
			const res = await fetch('/api/chords');
			if (res.ok) {
				const data = (await res.json()) as { bindings: ChordBinding[] };
				if (Array.isArray(data.bindings) && data.bindings.length > 0) {
					bindings = data.bindings;
				}
			}
		} catch {
			// keep the fallback set
		}
	});

	function keys(chord: string): string[] {
		return chord.replace('ArrowLeft', '←').replace('ArrowRight', '→').split('+');
	}
</script>

<aside class="rail" aria-label="Chord set">
	<h2 class="title">Chords</h2>
	<ul class="list">
		{#each bindings as b (b.command)}
			<li class="row">
				<span class="label">{b.label}</span>
				<span class="chord">
					{#each keys(b.chord) as k (k)}
						<kbd>{k}</kbd>
					{/each}
				</span>
			</li>
		{/each}
	</ul>
</aside>

<style>
	.rail {
		grid-area: chord;
		border-left: 1px solid var(--line);
		background: var(--bg-sink);
		padding: 0.9rem 0.8rem;
		overflow-y: auto;
		min-height: 0;
	}
	.title {
		margin: 0 0 0.8rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--bone-dim);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.label {
		font-size: 0.82rem;
		color: var(--bone);
	}
	.chord {
		display: flex;
		gap: 0.2rem;
	}
	kbd {
		font-family: var(--mono);
		font-size: 0.68rem;
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-bottom-width: 2px;
		border-radius: 4px;
		padding: 0.1rem 0.35rem;
		color: var(--bone-dim);
	}
</style>

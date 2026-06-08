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

<aside
	class="[grid-area:chord] border-l border-line bg-bg-sink px-[0.8rem] py-[0.9rem] overflow-y-auto min-h-0"
	aria-label="Chord set"
>
	<h2 class="mt-0 mb-[0.8rem] text-[0.72rem] uppercase tracking-[0.14em] text-bone-dim">Chords</h2>
	<ul class="list-none m-0 p-0 flex flex-col gap-[0.7rem]">
		{#each bindings as b (b.command)}
			<li class="flex flex-col gap-[0.3rem]">
				<span class="text-[0.82rem] text-bone">{b.label}</span>
				<span class="flex gap-[0.2rem]">
					{#each keys(b.chord) as k (k)}
						<kbd
							class="font-mono text-[0.68rem] bg-bg-raise border border-b-2 border-line rounded-[4px] px-[0.35rem] py-[0.1rem] text-bone-dim"
							>{k}</kbd
						>
					{/each}
				</span>
			</li>
		{/each}
	</ul>
</aside>

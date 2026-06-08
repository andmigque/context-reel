<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { SAMPLE_DOCS } from '$lib/docs';

	// A pill click fires the in-zap: dispatch the doc onto the channel the editor
	// and the markmap both listen on. The view does not change — only the chords
	// move views. The editor persists the doc, and whichever view is open (editor
	// or markmap) re-renders from it.
	function pick(text: string): void {
		window.dispatchEvent(new CustomEvent('context-reel:to-editor', { detail: text }));
		workspace.drawerOpen = false;
	}
</script>

<!-- Below the `rail` breakpoint the aside leaves the grid, fixes to the left edge,
     and slides in only when data-open is true (the drawer chord toggles it). -->
<aside
	class="[grid-area:zap] flex flex-col gap-[0.6rem] border-r border-line bg-bg-sink px-[0.8rem] py-[0.9rem] overflow-y-auto min-h-0 max-rail:fixed max-rail:top-[var(--navbar-h)] max-rail:bottom-0 max-rail:left-0 max-rail:w-[var(--rail)] max-rail:-translate-x-full max-rail:transition-transform max-rail:duration-150 max-rail:ease-out max-rail:z-20 max-rail:data-[open=true]:translate-x-0 max-rail:data-[open=true]:shadow-[0_0_30px_rgba(0,0,0,0.6)]"
	data-open={workspace.drawerOpen}
	aria-label="Doc drawer"
>
	<h2 class="m-0 text-[0.72rem] uppercase tracking-[0.14em] text-bone-dim">Docs</h2>
	<ul class="list-none m-0 p-0 flex flex-col gap-[0.4rem]">
		{#each SAMPLE_DOCS as doc (doc.id)}
			<li>
				<button
					class="w-full text-left bg-bg-raise border border-line rounded-card px-[0.6rem] py-[0.45rem] text-bone font-mono text-[0.82rem] transition-colors hover:border-green hover:text-green"
					onclick={() => pick(doc.text)}
					title="Load into the editor"
				>
					{doc.title}
				</button>
			</li>
		{/each}
	</ul>
	<p class="mt-auto text-[0.72rem] text-bone-dim leading-[1.5]">
		Click a doc to load it.
		<kbd class="kbd-hint">Alt</kbd><kbd class="kbd-hint">Shift</kbd><kbd class="kbd-hint">←</kbd> toggles
		this drawer.
	</p>
</aside>

<style>
	/* Inline kbd chips inside the hint paragraph — too many repeated atoms to be
	   worth spelling out per element; kept local to this component. */
	.kbd-hint {
		font-family: var(--font-mono);
		font-size: 0.62rem;
		background: var(--color-bg-raise);
		border: 1px solid var(--color-line);
		border-radius: 3px;
		padding: 0.05rem 0.25rem;
		margin: 0 0.05rem;
	}
</style>

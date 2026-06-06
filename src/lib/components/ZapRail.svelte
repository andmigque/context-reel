<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { SAMPLE_DOCS } from '$lib/docs';

	// A pill click fires the in-zap: dispatch the doc text, then make sure the
	// editor is the view that receives it.
	function pick(text: string): void {
		window.dispatchEvent(new CustomEvent('context-reel:to-editor', { detail: text }));
		workspace.show('editor');
		workspace.drawerOpen = false;
	}
</script>

<aside class="rail" data-open={workspace.drawerOpen} aria-label="Doc drawer">
	<h2 class="title">Docs</h2>
	<ul class="list">
		{#each SAMPLE_DOCS as doc (doc.id)}
			<li>
				<button class="pill" onclick={() => pick(doc.text)} title="Load into the editor">
					{doc.title}
				</button>
			</li>
		{/each}
	</ul>
	<p class="hint">Click a doc to load it. <kbd>Alt</kbd><kbd>Shift</kbd><kbd>←</kbd> toggles this drawer.</p>
</aside>

<style>
	.rail {
		grid-area: zap;
		border-right: 1px solid var(--line);
		background: var(--bg-sink);
		padding: 0.9rem 0.8rem;
		overflow-y: auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.title {
		margin: 0;
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
		gap: 0.4rem;
	}
	.pill {
		width: 100%;
		text-align: left;
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.45rem 0.6rem;
		color: var(--bone);
		font-family: var(--mono);
		font-size: 0.82rem;
		transition: border-color 0.12s, color 0.12s;
	}
	.pill:hover {
		border-color: var(--green);
		color: var(--green);
	}
	.hint {
		margin-top: auto;
		font-size: 0.72rem;
		color: var(--bone-dim);
		line-height: 1.5;
	}
	.hint kbd {
		font-family: var(--mono);
		font-size: 0.62rem;
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: 3px;
		padding: 0.05rem 0.25rem;
		margin: 0 0.05rem;
	}

	/* On a narrow viewport the rail collapses and the drawer chord reveals it. */
	@media (max-width: 860px) {
		.rail {
			position: fixed;
			top: var(--navbar-h);
			bottom: 0;
			left: 0;
			width: var(--rail);
			transform: translateX(-100%);
			transition: transform 0.16s ease;
			z-index: 20;
		}
		.rail[data-open='true'] {
			transform: translateX(0);
			box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
		}
	}
</style>

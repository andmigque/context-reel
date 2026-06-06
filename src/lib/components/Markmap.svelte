<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { Transformer as TransformerType } from 'markmap-lib';
	import type { Markmap as MarkmapType } from 'markmap-view';

	// The editor's document is the source. We read the same value the editor
	// persists; we never write it. (The editor owns this key.)
	const STORAGE_KEY = 'context-reel:editor:doc';
	// The same window channel the editor listens on. Its detail is the markdown.
	const ZAP_CHANNEL = 'context-reel:to-editor';

	// Shown when no document has been written yet, so the empty state still
	// paints a map instead of a blank panel.
	const PLACEHOLDER =
		'# ContextReel\n\n## Write in the editor\n\n- The mind map renders your document\n- Headings and bullets become nodes\n- Click a node to fold it';

	// A unique id per instance so a re-mount never collides with a stale target.
	// A module counter is deterministic across SSR and hydration; there is only
	// ever one map instance, so this stays stable.
	let nextId = 0;
	const svgId = `markmap-svg-${(nextId += 1)}`;

	let svg: SVGSVGElement | undefined;
	let transformer: TransformerType | undefined;
	let MarkmapClass: typeof MarkmapType | undefined;
	let markmap: MarkmapType | undefined;
	// Bumped per draw; a draw whose number is stale skips its fit so a newer pick
	// is never overridden by an older one finishing late.
	let renderSeq = 0;

	/** Read the editor's document, falling back to the placeholder. Read-only. */
	function currentDoc(): string {
		try {
			const saved = localStorage.getItem(STORAGE_KEY) ?? '';
			return saved.length > 0 ? saved : PLACEHOLDER;
		} catch {
			return PLACEHOLDER;
		}
	}

	/**
	 * Transform markdown to a node tree and draw it: create the map on first
	 * paint, set its data on every paint after. A transform or render failure
	 * leaves the prior tree (or nothing yet) standing — never a blank panel,
	 * never an uncaught error.
	 */
	async function renderDoc(markdown: string): Promise<void> {
		if (transformer === undefined || MarkmapClass === undefined || svg === undefined) return;
		const source = markdown.length > 0 ? markdown : PLACEHOLDER;
		const seq = (renderSeq += 1);
		try {
			const { root } = transformer.transform(source);
			if (markmap === undefined) {
				// create awaits its own setData before fitting (its documented shape).
				markmap = MarkmapClass.create(svg, undefined, root);
			} else {
				// Mirror create: setData is async — it measures the new tree before
				// it resolves. fit reads those measurements, so it must run after.
				// A synchronous fit reads the prior tree's bounds and lands the map
				// off-center. Skip a fit a newer pick has already superseded.
				await markmap.setData(root);
				if (seq !== renderSeq) return;
				await markmap.fit();
			}
		} catch {
			// Keep the placeholder or the prior tree. The panel is never blank.
		}
	}

	/**
	 * A doc on the zap channel carries the editor's document to render. Only draw
	 * once the map is built; before the first show the editor has already
	 * persisted the doc, so the first show reads it. Defer a frame so the re-fit
	 * measures the laid-out panel.
	 */
	function onZap(event: Event): void {
		if (markmap === undefined) return;
		const text = (event as CustomEvent<string>).detail ?? '';
		requestAnimationFrame(() => renderDoc(text));
	}

	onMount(async () => {
		// Browser-only: the server loads no markmap globals.
		const lib = await import('markmap-lib');
		const view = await import('markmap-view');
		transformer = new lib.Transformer();
		MarkmapClass = view.Markmap;

		// Do not build here: the panel may be hidden, and a fit against a
		// display:none (0x0) box yields NaN transforms and a mis-scaled tree. The
		// show effect builds the map once the panel is visible — and it also runs
		// on mount, so a markmap-default view would still paint.
		window.addEventListener(ZAP_CHANNEL, onZap);
	});

	// MarkMap renders what's in the editor: when this becomes the shown view, the
	// component is still mounted, so re-read the editor's document and draw. Defer
	// to the next frame so the panel is visible and laid out before markmap
	// measures it — a synchronous draw at the un-hide measures a zero-size box and
	// fits to NaN, which paints the tree off the edge.
	$effect(() => {
		if (workspace.view === 'markmap') {
			requestAnimationFrame(() => renderDoc(currentDoc()));
		}
	});

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		window.removeEventListener(ZAP_CHANNEL, onZap);
		if (markmap !== undefined) {
			markmap.destroy();
			markmap = undefined;
		}
	});
</script>

<div class="markmap-root">
	<!-- Light DOM: markmap-view measures the SVG through d3 against the document,
	     so a shadow root would wall it off and break sizing. Svelte renders to
	     light DOM, so nothing extra is needed. -->
	<svg bind:this={svg} id={svgId} class="markmap-svg" aria-label="Document mind map"></svg>
</div>

<style>
	/* Height is fluid — the panel owns the size, never a frozen px box. */
	.markmap-root {
		height: 100%;
		min-height: 0;
	}

	/* The SVG fills the root so the first fit has a box to measure and the tree
	   pans inside it instead of growing the page. */
	.markmap-svg {
		width: 100%;
		height: 100%;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--radius);
	}

	/* markmap tokenizes its palette as CSS variables on the .markmap class it adds
	   to the SVG; its default text color is near-invisible on the dark panel. The
	   svg carries both markmap-svg and markmap, so this two-class selector outweighs
	   markmap's single .markmap rule and wins without !important. Node text and code
	   theme to the palette; the branch link colors stay at the library default. */
	.markmap-svg:global(.markmap) {
		--markmap-text-color: var(--bone);
		--markmap-a-color: var(--green);
		--markmap-a-hover-color: var(--amber);
		--markmap-code-color: var(--bone);
		--markmap-code-bg: var(--bg-sink);
	}
</style>

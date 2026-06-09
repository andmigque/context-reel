<script lang="ts">
	//// # ZapRail.svelte
	//// The document rail. Pages docs from disk, groups them by source path, and loads one into the
	//// editor. Two forms: a thin closed track and a full open panel, toggled by the ZapRail chord
	//// Alt+Shift+ArrowLeft. The last row carries a reveal trigger that pages in the next slice.
	//// Spec: spec/zaprail.spec.md.
	import { tick } from 'svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { reveal } from '$lib/actions/reveal';
	import type { Doc, DocGroup, DocPage } from '$lib/docs';

	//// ## State
	let groups = $state<DocGroup[]>([]);
	let page = $state<number>(0);
	let hasMore = $state<boolean>(true);
	let loading = $state<boolean>(false);
	let selectedId = $state<string>('');

	//// The id of the final row, so only it arms the reveal trigger.
	let lastId = $derived.by(() => {
		const lastGroup = groups[groups.length - 1];
		const lastDoc = lastGroup?.docs[lastGroup.docs.length - 1];
		return lastDoc ? lastDoc.id : '';
	});

	//// ### mergeGroups
	//// Append an incoming page's groups, folding a leading group into the current tail when they share
	//// a path, so a path split across a page boundary still renders under one heading.
	function mergeGroups(incoming: DocGroup[]): void {
		const merged = groups.map((g) => ({ path: g.path, docs: [...g.docs] }));
		for (const g of incoming) {
			const tail = merged[merged.length - 1];
			if (tail && tail.path === g.path) tail.docs.push(...g.docs);
			else merged.push({ path: g.path, docs: [...g.docs] });
		}
		groups = merged;
	}

	//// ### loadNext
	//// Fetch the next page and append it. Stops when a load is in flight or the last page reported no
	//// more docs. A failed fetch leaves the list as it is.
	async function loadNext(): Promise<void> {
		if (loading || !hasMore) return;
		loading = true;
		try {
			const res = await fetch(`/api/docs?page=${page + 1}`);
			if (!res.ok) return;
			const data = (await res.json()) as DocPage;
			mergeGroups(data.groups);
			page = data.page;
			hasMore = data.hasMore;
		} catch {
			//// Leave the list unchanged; the next reveal will retry.
		} finally {
			loading = false;
		}
	}

	//// ### load
	//// Fetch a doc's text by id, hand it to the editor channel, and mark it selected. A failed fetch
	//// leaves the editor unchanged and the doc unselected. On the small-screen overlay, close after.
	async function load(id: string): Promise<void> {
		try {
			const res = await fetch(`/api/docs/${id}`);
			if (!res.ok) return;
			const doc = (await res.json()) as Doc;
			window.dispatchEvent(new CustomEvent('context-reel:to-editor', { detail: doc.text }));
			selectedId = id;
			if (window.matchMedia('(max-width: 53.75rem)').matches) close();
		} catch {
			//// Leave the editor unchanged.
		}
	}

	//// ### open
	//// Open the ZapRail and move focus onto a doc, so the list is browsable from the keyboard.
	function open(): void {
		workspace.openDrawer();
		void focusDoc();
	}

	//// ### close
	//// Close the ZapRail and return focus to the middle view, so a keyboard user is never stranded.
	function close(): void {
		workspace.drawerOpen = false;
		window.dispatchEvent(new Event('context-reel:focus-view'));
	}

	//// ### focusDoc
	//// After the open panel paints, focus the selected doc if present, else the first doc.
	async function focusDoc(): Promise<void> {
		await tick();
		const root = document.querySelector('aside[aria-label="ZapRail"]');
		const target = root?.querySelector('.doc[data-selected="true"]') ?? root?.querySelector('.doc');
		if (target instanceof HTMLElement) target.focus();
	}

	//// First open pages in the doc list, then lands focus on a doc once the rows exist. The component
	//// instance persists across open/close, so this runs once and reopening keeps the list.
	$effect(() => {
		if (workspace.drawerOpen && page === 0 && !loading) {
			void loadNext().then(() => focusDoc());
		}
	});
</script>

{#if workspace.drawerOpen}
	<aside
		class="[grid-area:zap] flex flex-col gap-[0.6rem] border-r border-line bg-bg-sink px-[0.8rem] py-[0.9rem] min-h-0 max-rail:fixed max-rail:top-[var(--navbar-h)] max-rail:bottom-0 max-rail:left-0 max-rail:w-[var(--rail)] max-rail:z-20 max-rail:shadow-[0_0_30px_rgba(0,0,0,0.6)]"
		data-rail
		aria-label="ZapRail"
	>
		<header class="flex items-center justify-between">
			<h2 class="m-0 text-[0.72rem] uppercase tracking-[0.14em] text-bone-dim">⚡ Zap</h2>
			<button
				class="leading-none text-[1.1rem] text-bone-dim bg-transparent border-0 px-1 hover:text-red"
				aria-label="Close ZapRail"
				onclick={close}>×</button
			>
		</header>

		<ul class="doc-list list-none m-0 p-0 flex flex-col gap-[0.4rem] overflow-y-auto min-h-0">
			{#each groups as group (group.path)}
				{#if group.path}
					<li class="group-head font-mono text-[0.64rem] uppercase tracking-[0.14em] text-bone-dim px-[0.2rem] pt-[0.4rem]">
						{group.path}
					</li>
				{/if}
				{#each group.docs as doc (doc.id)}
					<li>
						<button
							class="doc w-full text-left bg-bg-raise border border-line rounded-card px-[0.6rem] py-[0.45rem] text-bone font-mono text-[0.82rem] transition-colors"
							data-selected={selectedId === doc.id}
							use:reveal={{ armed: doc.id === lastId && hasMore, onReveal: loadNext }}
							onclick={() => load(doc.id)}
							title="Load into the editor"
						>
							{doc.title}
						</button>
					</li>
				{/each}
			{/each}
			{#if loading}
				<li class="text-bone-dim font-mono text-[0.7rem] px-[0.3rem] py-[0.3rem]">Loading…</li>
			{/if}
			{#if !loading && groups.length === 0}
				<li class="text-bone-dim font-mono text-[0.7rem] px-[0.3rem] py-[0.3rem]">No docs found.</li>
			{/if}
		</ul>

		<p class="mt-auto text-[0.72rem] text-bone-dim leading-[1.5]">
			Click or press <kbd class="kbd-hint">Enter</kbd> to load.
			<kbd class="kbd-hint">Alt</kbd><kbd class="kbd-hint">Shift</kbd><kbd class="kbd-hint">←</kbd>
			toggles this rail.
		</p>
	</aside>
{:else}
	<button class="zap-closed [grid-area:zap]" data-rail aria-label="Open ZapRail" onclick={open}>
		<span class="zap-closed-label">⚡ Zap</span>
	</button>
{/if}

<style>
	/* The doc list scrolls without scrollbar chrome (spec: no visible scrollbar). */
	.doc-list {
		scrollbar-width: none;
	}
	.doc-list::-webkit-scrollbar {
		display: none;
	}

	/* Doc rows: hover green, selected amber, focus a clear ring. Colour carries
	   movement and selection through the list (spec). */
	.doc:hover {
		border-color: var(--green);
		color: var(--green);
	}
	.doc:focus-visible {
		outline: 2px solid var(--blue);
		outline-offset: 1px;
	}
	.doc[data-selected='true'] {
		border-color: var(--amber);
		color: var(--amber);
	}

	/* Closed form: a thin vertical track, like a rail line, that opens the ZapRail. */
	.zap-closed {
		height: 100%;
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 0.9rem;
		background: var(--bg-sink);
		border: 0;
		border-right: 1px solid var(--line);
		color: var(--bone-dim);
		transition: color 0.12s ease;
	}
	.zap-closed:hover {
		color: var(--green);
	}
	.zap-closed:focus-visible {
		outline: 2px solid var(--blue);
		outline-offset: -2px;
	}
	.zap-closed-label {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}

	.kbd-hint {
		font-family: var(--mono);
		font-size: 0.62rem;
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: 3px;
		padding: 0.05rem 0.25rem;
		margin: 0 0.05rem;
	}
</style>
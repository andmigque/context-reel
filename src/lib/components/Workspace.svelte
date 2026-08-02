<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { installChordListener } from '$lib/chords/keymap';
	import { CHORD_BINDINGS } from '$lib/chords/registry';
	import type { ChordCommand, ViewName } from '$lib/types';
	import Navbar from './Navbar.svelte';
	import ZapRail from './ZapRail.svelte';
	import ChordRail from './ChordRail.svelte';
	import Editor from './Editor.svelte';
	import Chat from './Chat.svelte';
	import Config from './Config.svelte';
	import Markmap from './Markmap.svelte';

	function run(command: ChordCommand): void {
		switch (command) {
			case 'jump.editor':
				workspace.show('editor');
				break;
			case 'jump.chat':
				workspace.show('chat');
				break;
			case 'jump.config':
				workspace.show('config');
				break;
			case 'jump.markmap':
				workspace.show('markmap');
				break;
			case 'workspace.openZapDrawer':
				workspace.toggleZapRail();
				if (workspace.drawerOpen) void focusDrawer();
				else void focusView(workspace.view);
				break;
			case 'workspace.cheatSheet':
				workspace.toggleCheatSheet();
				break;
			case 'jump.git':
				// No git view yet — the chord is registered but lands nowhere. Quiet.
				break;
			case 'editor.zapToChat':
			case 'editor.togglePreview':
				// Editor-owned: hand off to the editor, which acts only if mounted.
				window.dispatchEvent(new CustomEvent('context-reel:command', { detail: command }));
				break;
		}
	}

	// A view switch must land focus inside the new view, not just show it — a jump
	// that leaves focus behind reads as "nothing happened". Editor and chat focus
	// their text input; the rest focus the shown panel so the next key goes there.
	const FOCUS_WITHIN: Partial<Record<ViewName, string>> = {
		editor: '#context-reel-editor',
		chat: 'textarea.input'
	};

	async function focusView(view: ViewName): Promise<void> {
		await tick(); // wait for the target slot to un-hide
		const selector = FOCUS_WITHIN[view];
		const preferred = selector ? document.querySelector(selector) : undefined;
		const panel = document.querySelector('main.view .slot:not([hidden])');
		const target = preferred ?? panel;
		if (target instanceof HTMLElement) target.focus();
	}

	// Opening the doc drawer lands focus on its first doc, so it can be browsed
	// with the keyboard alone — arrow/tab then move between the docs.
	async function focusDrawer(): Promise<void> {
		await tick();
		const root = document.querySelector('aside[aria-label="ZapRail"]');
		const target = root?.querySelector('.doc[data-selected="true"]') ?? root?.querySelector('.doc');
		if (target instanceof HTMLElement) target.focus();
	}

	// Focus follows the shown view on every change after the first paint, so a
	// chord jump or a tab click puts the caret where the user expects. The first
	// run is the initial mount; we let the page settle without grabbing focus.
	let viewSettled = false;
	$effect(() => {
		const view = workspace.view;
		if (!viewSettled) {
			viewSettled = true;
			return;
		}
		void focusView(view);
	});

	// Escape closes whatever overlay is open, so a modal never traps a
	// keyboard-only user. The cheat sheet takes priority over the doc drawer.
	function handleEscape(event: KeyboardEvent): void {
		if (event.key !== 'Escape') {
			return;
		}
		if (workspace.cheatOpen) {
			workspace.toggleCheatSheet();
			return;
		}
		if (workspace.drawerOpen) {
			workspace.drawerOpen = false;
			void focusView(workspace.view);
		}
	}

	// The ZapRail close button returns focus to the middle view through this channel,
	// so the close path is shared with the drawer chord and Escape.
	onMount(() => {
		const teardown = installChordListener(run);
		const refocus = (): void => void focusView(workspace.view);
		window.addEventListener('context-reel:focus-view', refocus);
		return () => {
			teardown();
			window.removeEventListener('context-reel:focus-view', refocus);
		};
	});
</script>

<svelte:window onkeydown={handleEscape} />

<div class="workspace" data-rail-open={workspace.drawerOpen}>
	<Navbar />
	<ZapRail />

	<main class="view" aria-label="Active view">
		<!-- Every view stays mounted; we toggle which is shown so a doc, a stream,
		     the roster, and the mind map all survive a view swap with no reload. -->
		<div class="slot" tabindex="-1" hidden={workspace.view !== 'editor'}><Editor /></div>
		<div class="slot" tabindex="-1" hidden={workspace.view !== 'chat'}><Chat /></div>
		<div class="slot" tabindex="-1" hidden={workspace.view !== 'config'}><Config /></div>
		<div class="slot" tabindex="-1" hidden={workspace.view !== 'markmap'}><Markmap /></div>
	</main>

	<ChordRail />
</div>

{#if workspace.cheatOpen}
	<button
		class="fixed inset-0 bg-black/50 border-0 z-30"
		aria-label="Close cheat sheet"
		onclick={() => workspace.toggleCheatSheet()}
	></button>
	<div
		class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[31] bg-bg-raise border border-line rounded-card px-6 py-[1.2rem] min-w-[22rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
		role="dialog"
		aria-label="Chord cheat sheet"
	>
		<h2 class="mt-0 mb-[0.8rem] text-[0.8rem] uppercase tracking-[0.14em] text-bone-dim">Chords</h2>
		<ul class="list-none m-0 p-0 flex flex-col gap-2">
			{#each CHORD_BINDINGS as b (b.command)}
				<li class="flex items-center gap-[0.7rem] text-[0.88rem]">
					<kbd
						class="font-mono text-[0.74rem] bg-bg-sink border border-b-2 border-line rounded-[4px] px-[0.45rem] py-[0.15rem] min-w-[6.5rem] text-center"
						>{b.chord.replace('ArrowLeft', '←').replace('ArrowRight', '→')}</kbd
					>
					{b.label}
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.workspace {
		display: grid;
		grid-template-rows: var(--navbar-h) 1fr;
		/* minmax(0, 1fr) gives the middle track min-width:0 so a wide child
		   cannot stretch it past one fraction. Rails hold fixed widths. */
		grid-template-columns: var(--rail-closed) minmax(0, 1fr) var(--rail);
		grid-template-areas:
			'nav nav nav'
			'zap view chord';
		height: 100vh;
		width: 100vw;
		overflow: hidden;
	}
	.view {
		grid-area: view;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		/* The active view fills the height of its track — never a frozen px box. */
		display: grid;
	}
	.slot {
		grid-area: 1 / 1;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}
	.slot[hidden] {
		display: none;
	}
	/* The panel is a programmatic focus target (tabindex -1) for views with no
	   single input; suppress the ring so a jump does not flash a border. */
	.slot:focus {
		outline: none;
	}

	/* Open widens the zap rail from the thin track to the full panel. */
	.workspace[data-rail-open='true'] {
		grid-template-columns: var(--rail) minmax(0, 1fr) var(--rail);
	}

	@media (max-width: 860px) {
		/* The zap rail stays a thin track; the open panel overlays via position: fixed. */
		.workspace,
		.workspace[data-rail-open='true'] {
			grid-template-columns: var(--rail-closed) minmax(0, 1fr) 0;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { installChordListener } from '$lib/chords/keymap';
	import { CHORD_BINDINGS } from '$lib/chords/registry';
	import type { ChordCommand } from '$lib/types';
	import Navbar from './Navbar.svelte';
	import ZapRail from './ZapRail.svelte';
	import ChordRail from './ChordRail.svelte';
	import Editor from './Editor.svelte';
	import Chat from './Chat.svelte';
	import Config from './Config.svelte';

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
			case 'workspace.openZapDrawer':
				workspace.toggleDrawer();
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

	onMount(() => installChordListener(run));
</script>

<div class="workspace">
	<Navbar />
	<ZapRail />

	<main class="view" aria-label="Active view">
		<!-- All three views stay mounted; we toggle which is shown so a doc, a
		     stream, and the roster all survive a view swap with no reload. -->
		<div class="slot" hidden={workspace.view !== 'editor'}><Editor /></div>
		<div class="slot" hidden={workspace.view !== 'chat'}><Chat /></div>
		<div class="slot" hidden={workspace.view !== 'config'}><Config /></div>
	</main>

	<ChordRail />
</div>

{#if workspace.cheatOpen}
	<button
		class="scrim"
		aria-label="Close cheat sheet"
		onclick={() => workspace.toggleCheatSheet()}
	></button>
	<div class="cheat" role="dialog" aria-label="Chord cheat sheet">
		<h2>Chords</h2>
		<ul>
			{#each CHORD_BINDINGS as b (b.command)}
				<li><kbd>{b.chord.replace('ArrowLeft', '←').replace('ArrowRight', '→')}</kbd> {b.label}</li>
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
		grid-template-columns: var(--rail) minmax(0, 1fr) var(--rail);
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

	@media (max-width: 860px) {
		.workspace {
			grid-template-columns: 0 minmax(0, 1fr) 0;
		}
	}

	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		border: 0;
		z-index: 30;
	}
	.cheat {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 31;
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 1.2rem 1.5rem;
		min-width: 22rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
	}
	.cheat h2 {
		margin: 0 0 0.8rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--bone-dim);
	}
	.cheat ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.cheat li {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-size: 0.88rem;
	}
	.cheat kbd {
		font-family: var(--mono);
		font-size: 0.74rem;
		background: var(--bg-sink);
		border: 1px solid var(--line);
		border-bottom-width: 2px;
		border-radius: 4px;
		padding: 0.15rem 0.45rem;
		min-width: 6.5rem;
		text-align: center;
	}
</style>

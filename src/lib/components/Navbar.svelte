<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { ViewName } from '$lib/types';

	const tabs: Array<{ view: ViewName; label: string; chord: string }> = [
		{ view: 'editor', label: 'Editor', chord: 'Alt+Shift+E' },
		{ view: 'chat', label: 'Chat', chord: 'Alt+Shift+C' },
		{ view: 'config', label: 'Config', chord: 'Alt+Shift+K' }
	];
</script>

<nav class="navbar" aria-label="Workspace views">
	<span class="brand">
		<span class="dot" aria-hidden="true"></span>
		ContextReel
	</span>

	<div class="tabs" role="tablist">
		{#each tabs as tab (tab.view)}
			<button
				class="tab"
				role="tab"
				aria-selected={workspace.view === tab.view}
				title={tab.chord}
				onclick={() => workspace.show(tab.view)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<button class="cheat" title="Alt+Shift+→" onclick={() => workspace.toggleCheatSheet()}>
		chords
	</button>
</nav>

<style>
	.navbar {
		grid-area: nav;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0 1rem;
		background: var(--bg-sink);
		border-bottom: 1px solid var(--line);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--bone);
	}
	.dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--amber);
		box-shadow: 0 0 8px var(--amber);
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		margin-left: 0.5rem;
	}
	.tab {
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius);
		padding: 0.35rem 0.8rem;
		color: var(--bone-dim);
		transition: color 0.12s, background 0.12s, border-color 0.12s;
	}
	.tab:hover {
		color: var(--bone);
		background: var(--bg-raise);
	}
	.tab[aria-selected='true'] {
		color: var(--bg-sink);
		background: var(--green);
		border-color: var(--green);
		font-weight: 600;
	}
	.cheat {
		margin-left: auto;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.3rem 0.7rem;
		color: var(--bone-dim);
		font-size: 0.85rem;
	}
	.cheat:hover {
		color: var(--amber);
		border-color: var(--amber);
	}
</style>

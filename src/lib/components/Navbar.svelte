<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { ViewName } from '$lib/types';

	const tabs: Array<{ view: ViewName; label: string; chord: string }> = [
		{ view: 'editor', label: 'Editor', chord: 'Alt+Shift+E' },
		{ view: 'chat', label: 'Chat', chord: 'Alt+Shift+C' },
		{ view: 'config', label: 'Config', chord: 'Alt+Shift+K' },
		{ view: 'markmap', label: 'Mark Map', chord: 'Alt+Shift+M' }
	];
</script>

<nav
	class="[grid-area:nav] flex items-center gap-4 px-4 bg-bg-sink border-b border-line"
	aria-label="Workspace views"
>
	<span class="flex items-center gap-2 font-semibold tracking-[0.02em] text-bone">
		<span
			class="w-[0.6rem] h-[0.6rem] rounded-full bg-amber shadow-[0_0_8px_var(--color-amber)]"
			aria-hidden="true"
		></span>
		Context Reel
	</span>

	<div class="flex gap-1 ml-2" role="tablist">
		{#each tabs as tab (tab.view)}
			<button
				class="bg-transparent border border-transparent rounded-card px-[0.8rem] py-[0.35rem] text-bone-dim transition-colors hover:text-bone hover:bg-bg-raise aria-selected:text-bg-sink aria-selected:bg-green aria-selected:border-green aria-selected:font-semibold"
				role="tab"
				aria-selected={workspace.view === tab.view}
				title={tab.chord}
				onclick={() => workspace.show(tab.view)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<button
		class="ml-auto bg-transparent border border-line rounded-card px-[0.7rem] py-[0.3rem] text-bone-dim text-[0.85rem] hover:text-amber hover:border-amber"
		title="Alt+Shift+→"
		onclick={() => workspace.toggleCheatSheet()}
	>
		Chords
	</button>
</nav>

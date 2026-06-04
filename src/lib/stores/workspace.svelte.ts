import type { ViewName } from '$lib/types';

/**
 * Workspace shell state: which view fills the middle track, whether the doc
 * drawer or the chord cheat sheet is open, and the text the editor has zapped
 * toward the chat but the chat has not yet consumed.
 *
 * Swapping the view is a client-only state change — never a page reload.
 */
class WorkspaceStore {
	view = $state<ViewName>('editor');
	drawerOpen = $state(false);
	cheatOpen = $state(false);

	/** Text the editor stashed on its way to the chat; '' when nothing waits. */
	pendingZap = $state<string>('');

	show(view: ViewName): void {
		this.view = view;
	}

	toggleDrawer(): void {
		this.drawerOpen = !this.drawerOpen;
	}

	openDrawer(): void {
		this.drawerOpen = true;
	}

	toggleCheatSheet(): void {
		this.cheatOpen = !this.cheatOpen;
	}

	/** Editor → chat: stash the text and navigate the workspace to the chat. */
	zapToChat(text: string): void {
		this.pendingZap = text;
		this.view = 'chat';
	}

	/** Chat reads the stashed text once, then clears it. */
	consumeZap(): string {
		const text = this.pendingZap;
		this.pendingZap = '';
		return text;
	}
}

export const workspace = new WorkspaceStore();

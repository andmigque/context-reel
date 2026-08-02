//// # workspace (store)
//// Workspace shell state: which view fills the middle track, whether the doc drawer or the chord cheat
//// sheet is open, and the text the editor has zapped toward the chat but the chat has not yet consumed.
//// Swapping the view is a client-only state change — never a page reload.
////
//// ## Imports
import type { ViewName } from '$lib/types';

//// ## WorkspaceStore

//// ### WorkspaceStore
//// The shell singleton. Holds the active view, drawer/cheat-sheet flags, and the pending zap text.
class WorkspaceStore {
	//// - `ViewName`: __view__
	////     - *Which view fills the middle track.*
	view = $state<ViewName>('editor');
	//// - `boolean`: __drawerOpen__
	////     - *Whether the doc drawer is open.*
	drawerOpen = $state(false);
	//// - `boolean`: __cheatOpen__
	////     - *Whether the chord cheat sheet is open.*
	cheatOpen = $state(false);
	//// - `string`: __pendingZap__
	////     - *Text the editor stashed on its way to the chat; '' when nothing waits.*
	pendingZap = $state<string>('');

	//// ### show
	//// Switch the active view.
	show(view: ViewName): void {
		//// **Parameters**
		//// - `ViewName`: __view__
		////     - *The view to show.*
		this.view = view;
	}

	//// ### toggleZapRail
	//// Toggle the doc drawer.
	toggleZapRail(): void {
		this.drawerOpen = !this.drawerOpen;
	}

	//// ### openRail
	//// Open the doc drawer.
	openRail(): void {
		this.drawerOpen = true;
	}

	//// ### toggleCheatSheet
	//// Toggle the chord cheat sheet.
	toggleCheatSheet(): void {
		this.cheatOpen = !this.cheatOpen;
	}

	//// ### zapToChat
	//// Editor → chat: stash the text and navigate the workspace to the chat.
	zapToChat(text: string): void {
		//// **Parameters**
		//// - `string`: __text__
		////     - *The editor text to hand to the chat.*
		this.pendingZap = text;
		this.view = 'chat';
	}

	//// ### consumeZap
	//// Chat reads the stashed text once, then clears it.
	consumeZap(): string {
		//// **Returns**
		//// - `string`
		////     - *The stashed zap text, or '' if none.*
		const text = this.pendingZap;
		this.pendingZap = '';
		return text;
	}
}

//// ## Singleton
//// The shared workspace instance imported across the app.
export const workspace = new WorkspaceStore();

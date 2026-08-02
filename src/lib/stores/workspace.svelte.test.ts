import { describe, it, expect, beforeEach } from 'vitest';
import { workspace } from './workspace.svelte';

// The workspace singleton is shared, so reset the mutable surface before each
// test to keep them independent.
beforeEach(() => {
	workspace.view = 'editor';
	workspace.drawerOpen = false;
	workspace.cheatOpen = false;
	workspace.pendingZap = '';
});

describe('view switching', () => {
	it('show swaps the active view', () => {
		workspace.show('chat');
		expect(workspace.view).toBe('chat');
	});
});

describe('drawer', () => {
	it('toggleZapRail flips the open flag', () => {
		expect(workspace.drawerOpen).toBe(false);
		workspace.toggleZapRail();
		expect(workspace.drawerOpen).toBe(true);
		workspace.toggleZapRail();
		expect(workspace.drawerOpen).toBe(false);
	});

	it('openRail opens and is idempotent', () => {
		workspace.openRail();
		expect(workspace.drawerOpen).toBe(true);
		workspace.openRail();
		expect(workspace.drawerOpen).toBe(true);
	});
});

describe('cheat sheet', () => {
	it('toggleCheatSheet flips its flag', () => {
		workspace.toggleCheatSheet();
		expect(workspace.cheatOpen).toBe(true);
	});
});

describe('zap handoff editor -> chat', () => {
	it('zapToChat stashes the text and navigates to the chat', () => {
		workspace.zapToChat('selected text');
		expect(workspace.pendingZap).toBe('selected text');
		expect(workspace.view).toBe('chat');
	});

	it('consumeZap returns the text once, then clears it', () => {
		workspace.zapToChat('payload');
		expect(workspace.consumeZap()).toBe('payload');
		expect(workspace.consumeZap()).toBe('');
		expect(workspace.pendingZap).toBe('');
	});
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { chordOf, commandFor, installChordListener } from './keymap';
import type { ChordBinding } from '$lib/types';

// A KeyboardEvent factory so each test states only the keys it cares about.
function key(init: KeyboardEventInit): KeyboardEvent {
	return new KeyboardEvent('keydown', init);
}

describe('chordOf', () => {
	it('encodes modifiers in canonical Ctrl+Alt+Shift+Meta order', () => {
		const event = key({ key: 'E', code: 'KeyE', ctrlKey: true, altKey: true, shiftKey: true, metaKey: true });
		expect(chordOf(event)).toBe('Ctrl+Alt+Shift+Meta+E');
	});

	it('builds the workspace drawer chord from Alt+Shift+ArrowLeft', () => {
		expect(chordOf(key({ key: 'ArrowLeft', altKey: true, shiftKey: true }))).toBe('Alt+Shift+ArrowLeft');
	});

	it('prefers the physical KeyE code when Alt mangles event.key', () => {
		// Alt can hand event.key a dead-key glyph; the code is the source of truth.
		expect(chordOf(key({ key: '´', code: 'KeyE', altKey: true, shiftKey: true }))).toBe('Alt+Shift+E');
	});

	it('upper-cases a lone letter key when there is no Key* code', () => {
		expect(chordOf(key({ key: 'r', code: '', altKey: true, shiftKey: true }))).toBe('Alt+Shift+R');
	});

	it('returns an empty string for a lone modifier press', () => {
		expect(chordOf(key({ key: 'Alt', altKey: true }))).toBe('');
		expect(chordOf(key({ key: 'Shift', shiftKey: true }))).toBe('');
	});
});

describe('commandFor', () => {
	const bindings: ChordBinding[] = [{ command: 'jump.editor', chord: 'Alt+Shift+E', label: 'Editor' }];

	it('resolves a bound chord to its command', () => {
		expect(commandFor('Alt+Shift+E', bindings)).toBe('jump.editor');
	});

	it('returns undefined for an unbound chord', () => {
		expect(commandFor('Alt+Shift+Q', bindings)).toBeUndefined();
	});

	it('returns undefined for the empty chord, never matching by accident', () => {
		expect(commandFor('', bindings)).toBeUndefined();
	});

	it('resolves against the real registry by default', () => {
		expect(commandFor('Alt+Shift+ArrowLeft')).toBe('workspace.openZapDrawer');
	});
});

describe('installChordListener', () => {
	afterEach(() => vi.restoreAllMocks());

	it('fires only for Alt+Shift chords and ignores plain typing', () => {
		const onCommand = vi.fn();
		const teardown = installChordListener(onCommand);

		window.dispatchEvent(key({ key: 'e', code: 'KeyE' })); // no modifiers: free typing
		expect(onCommand).not.toHaveBeenCalled();

		window.dispatchEvent(key({ key: 'E', code: 'KeyE', altKey: true, shiftKey: true }));
		expect(onCommand).toHaveBeenCalledWith('jump.editor', expect.any(KeyboardEvent));

		teardown();
		window.dispatchEvent(key({ key: 'E', code: 'KeyE', altKey: true, shiftKey: true }));
		expect(onCommand).toHaveBeenCalledTimes(1); // teardown removed the listener
	});

	it('stays quiet on an Alt+Shift chord bound to nothing', () => {
		const onCommand = vi.fn();
		const teardown = installChordListener(onCommand);
		window.dispatchEvent(key({ key: 'Q', code: 'KeyQ', altKey: true, shiftKey: true }));
		expect(onCommand).not.toHaveBeenCalled();
		teardown();
	});
});

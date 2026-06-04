import type { ChordBinding, ChordCommand } from '$lib/types';
import { CHORD_BINDINGS } from './registry';

/** Build the canonical chord string for a keyboard event, e.g. "Alt+Shift+E". */
export function chordOf(event: KeyboardEvent): string {
	const parts: string[] = [];
	if (event.ctrlKey) parts.push('Ctrl');
	if (event.altKey) parts.push('Alt');
	if (event.shiftKey) parts.push('Shift');
	if (event.metaKey) parts.push('Meta');

	// A lone modifier press has no command key.
	const key = event.key;
	if (key === 'Alt' || key === 'Shift' || key === 'Control' || key === 'Meta') return '';

	// Letters normalise to upper case; Alt can mangle event.key, so prefer the
	// physical key code (KeyE -> E) when it is a letter.
	let token = key;
	if (/^Key[A-Z]$/.test(event.code)) token = event.code.slice(3);
	else if (token.length === 1) token = token.toUpperCase();

	parts.push(token);
	return parts.join('+');
}

/** Resolve a chord string to its command, or undefined if nothing is bound. */
export function commandFor(chord: string, bindings: ChordBinding[] = CHORD_BINDINGS): ChordCommand | undefined {
	if (chord === '') return undefined;
	return bindings.find((b) => b.chord === chord)?.command;
}

/**
 * Attach a global chord listener. The handler receives the resolved command;
 * a chord bound to nothing simply never calls back — no change, no throw.
 *
 * Returns a teardown function.
 */
export function installChordListener(
	onCommand: (command: ChordCommand, event: KeyboardEvent) => void,
	bindings: ChordBinding[] = CHORD_BINDINGS
): () => void {
	function handle(event: KeyboardEvent): void {
		// Only Alt+Shift chords are ours; ignore everything else so typing is free.
		if (!event.altKey || !event.shiftKey) return;
		const command = commandFor(chordOf(event), bindings);
		if (command === undefined) return; // dead chord: quiet, no throw
		event.preventDefault();
		onCommand(command, event);
	}
	window.addEventListener('keydown', handle);
	return () => window.removeEventListener('keydown', handle);
}

//// # keymap
//// The client-side chord resolver: turn a keyboard event into a canonical chord string, resolve that
//// string to a command, and install a global listener for the workspace's Alt+Shift chords.
////
//// ## Imports
import type { ChordBinding, ChordCommand } from '$lib/types';
import { CHORD_BINDINGS } from './registry';

//// ## Functions

//// ### chordOf
//// Build the canonical chord string for a keyboard event, e.g. "Alt+Shift+E".
export function chordOf(event: KeyboardEvent): string {
	//// **Parameters**
	//// - `KeyboardEvent`: __event__
	////     - *The keydown event to encode.*
	//// **Returns**
	//// - `string`
	////     - *The canonical chord string, or '' for a lone modifier press.*
	const parts: string[] = [];
	if (event.ctrlKey) parts.push('Ctrl');
	if (event.altKey) parts.push('Alt');
	if (event.shiftKey) parts.push('Shift');
	if (event.metaKey) parts.push('Meta');

	//// A lone modifier press has no command key.
	const key = event.key;
	if (key === 'Alt' || key === 'Shift' || key === 'Control' || key === 'Meta') return '';

	//// Letters normalise to upper case; Alt can mangle event.key, so prefer the physical key code
	//// (KeyE -> E) when it is a letter.
	let token = key;
	if (/^Key[A-Z]$/.test(event.code)) token = event.code.slice(3);
	else if (token.length === 1) token = token.toUpperCase();

	parts.push(token);
	return parts.join('+');
}

//// ### commandFor
//// Resolve a chord string to its command, or undefined if nothing is bound.
export function commandFor(chord: string, bindings: ChordBinding[] = CHORD_BINDINGS): ChordCommand | undefined {
	//// **Parameters**
	//// - `string`: __chord__
	////     - *The canonical chord string to resolve.*
	//// - `ChordBinding[]`: __bindings__
	////     - *The binding set to search; defaults to `CHORD_BINDINGS`.*
	//// **Returns**
	//// - `ChordCommand | undefined`
	////     - *The bound command, or undefined for an empty or unbound chord.*
	if (chord === '') return undefined;
	return bindings.find((b) => b.chord === chord)?.command;
}

//// ### installChordListener
//// Attach a global chord listener. The handler receives the resolved command; a chord bound to nothing
//// simply never calls back — no change, no throw. Returns a teardown function.
export function installChordListener(
	onCommand: (command: ChordCommand, event: KeyboardEvent) => void,
	bindings: ChordBinding[] = CHORD_BINDINGS
): () => void {
	//// **Parameters**
	//// - `(command: ChordCommand, event: KeyboardEvent) => void`: __onCommand__
	////     - *Called with the resolved command and the originating event.*
	//// - `ChordBinding[]`: __bindings__
	////     - *The binding set to resolve against; defaults to `CHORD_BINDINGS`.*
	//// **Returns**
	//// - `() => void`
	////     - *A teardown function that removes the listener.*
	function handle(event: KeyboardEvent): void {
		//// Only Alt+Shift chords are ours; ignore everything else so typing is free.
		if (!event.altKey || !event.shiftKey) return;
		const command = commandFor(chordOf(event), bindings);
		if (command === undefined) return; //// dead chord: quiet, no throw
		event.preventDefault();
		onCommand(command, event);
	}
	window.addEventListener('keydown', handle);
	return () => window.removeEventListener('keydown', handle);
}

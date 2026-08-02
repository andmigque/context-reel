//// # registry
//// The chord set — the one source of truth, as data, never a literal scattered through a template
//// (ChordRail spec). The /api/chords endpoint is the seam that serves these rows; the client keymap
//// resolves a keystroke against the same set. Command identity is separate from the chord string, so a
//// rebind swaps the keys and leaves the command alone. Every chord is Alt+Shift+<key> — a register the
//// browser and its devtools leave alone, so a workspace chord never collides with a claimed shortcut.
////
//// ## Imports
import type { ChordBinding } from '$lib/types';

//// ## Constants

//// ### CHORD_BINDINGS
//// The canonical chord-to-command bindings.
export const CHORD_BINDINGS: ChordBinding[] = [
	{ command: 'jump.editor', chord: 'Alt+Shift+E', label: 'Jump to the editor' },
	{ command: 'jump.chat', chord: 'Alt+Shift+C', label: 'Jump to the chat' },
	{ command: 'jump.config', chord: 'Alt+Shift+K', label: 'Jump to config' },
	{ command: 'jump.markmap', chord: 'Alt+Shift+M', label: 'Jump to the mark map' },
	{ command: 'editor.zapToChat', chord: 'Alt+Shift+Z', label: 'Zap the selection into the chat' },
	{ command: 'editor.togglePreview', chord: 'Alt+Shift+R', label: 'Toggle the rendered preview' },
	{ command: 'workspace.openZapDrawer', chord: 'Alt+Shift+ArrowLeft', label: 'Open the Zap Rail' },
	{ command: 'workspace.cheatSheet', chord: 'Alt+Shift+ArrowRight', label: 'Show the chord cheat sheet' },
	{ command: 'jump.git', chord: 'Alt+Shift+G', label: 'Jump to git (no view yet)' }
];

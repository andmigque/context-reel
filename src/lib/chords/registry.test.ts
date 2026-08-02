import { describe, it, expect } from 'vitest';
import { CHORD_BINDINGS } from './registry';

describe('CHORD_BINDINGS', () => {
	it('keeps every chord in the Alt+Shift register the browser leaves alone', () => {
		for (const binding of CHORD_BINDINGS) {
			expect(binding.chord, binding.command).toMatch(/^Alt\+Shift\+/);
		}
	});

	it('binds each chord to exactly one command', () => {
		const chords = CHORD_BINDINGS.map((b) => b.chord);
		expect(new Set(chords).size).toBe(chords.length);
	});

	it('maps each command to exactly one chord', () => {
		const commands = CHORD_BINDINGS.map((b) => b.command);
		expect(new Set(commands).size).toBe(commands.length);
	});

	it('gives every binding a non-empty human label for the cheat sheet', () => {
		for (const binding of CHORD_BINDINGS) {
			expect(binding.label.trim().length, binding.command).toBeGreaterThan(0);
		}
	});

	it('binds the doc drawer to Alt+Shift+ArrowLeft', () => {
		const drawer = CHORD_BINDINGS.find((b) => b.command === 'workspace.openZapDrawer');
		expect(drawer?.chord).toBe('Alt+Shift+ArrowLeft');
	});
});

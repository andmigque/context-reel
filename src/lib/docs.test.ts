import { describe, it, expect } from 'vitest';
import { SAMPLE_DOCS } from './docs';

// The zap rail keys its #each on doc.id and loads doc.text into the editor, so
// these invariants protect the rail's rendering and load contract.
describe('SAMPLE_DOCS', () => {
	it('gives every doc a unique id so the #each key is stable', () => {
		const ids = SAMPLE_DOCS.map((d) => d.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('gives every doc a title and non-empty text to load', () => {
		for (const doc of SAMPLE_DOCS) {
			expect(doc.title.trim().length, doc.id).toBeGreaterThan(0);
			expect(doc.text.trim().length, doc.id).toBeGreaterThan(0);
		}
	});

	it('ships the welcome doc the editor preview test renders', () => {
		const welcome = SAMPLE_DOCS.find((d) => d.id === 'welcome');
		expect(welcome?.title).toBe('welcome.md');
		expect(welcome?.text).toContain('# Context Reel');
	});
});

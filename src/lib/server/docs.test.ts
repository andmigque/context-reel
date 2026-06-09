import { describe, it, expect } from 'vitest';
import { idFor, pathFromId, resolveWithinRoot, pageDocs, readDocText, PAGE_SIZE } from './docs';
import type { DocMeta } from '$lib/docs';

// The id is the seam between the list rows and the text endpoint, so it must round-trip exactly and
// reject anything that is not the encoding we issued.
describe('idFor / pathFromId', () => {
	it('round-trips a relative posix path through the opaque id', () => {
		const rel = 'policy/access-control.md';
		expect(pathFromId(idFor(rel))).toBe(rel);
	});

	it('returns undefined for an id that is not valid base64url', () => {
		expect(pathFromId('not base64!')).toBeUndefined();
	});
});

// The endpoint must serve only files under the root; a decoded id that escapes the root is rejected
// before any read (the path-traversal acceptance criterion).
describe('resolveWithinRoot', () => {
	const root = resolveWithinRoot('/srv/docs', '.') ?? '/srv/docs';

	it('resolves a path that stays under the root', () => {
		expect(resolveWithinRoot(root, 'policy/ac.md')).toBeDefined();
	});

	it('rejects a path that climbs out of the root', () => {
		expect(resolveWithinRoot(root, '../../etc/passwd')).toBeUndefined();
	});
});

// pageDocs is the pure pager: fixed-size slices, grouped by path, with hasMore false on the last page.
describe('pageDocs', () => {
	function make(n: number): DocMeta[] {
		return Array.from({ length: n }, (_, i) => {
			const group = i < 20 ? 'a' : 'b';
			return { id: `id${i}`, title: `doc${String(i).padStart(3, '0')}.md`, path: group };
		});
	}

	it('returns the first PAGE_SIZE rows and reports more remain', () => {
		const page = pageDocs(make(PAGE_SIZE + 5), 1);
		const count = page.groups.reduce((sum, g) => sum + g.docs.length, 0);
		expect(count).toBe(PAGE_SIZE);
		expect(page.hasMore).toBe(true);
		expect(page.page).toBe(1);
	});

	it('returns the remainder on the last page and reports no more', () => {
		const page = pageDocs(make(PAGE_SIZE + 5), 2);
		const count = page.groups.reduce((sum, g) => sum + g.docs.length, 0);
		expect(count).toBe(5);
		expect(page.hasMore).toBe(false);
	});

	it('groups consecutive rows that share a path', () => {
		const page = pageDocs(make(25), 1);
		expect(page.groups.map((g) => g.path)).toEqual(['a', 'b']);
		expect(page.groups[0].docs.length).toBe(20);
		expect(page.groups[1].docs.length).toBe(5);
	});

	it('clamps a page below 1 to page 1', () => {
		expect(pageDocs(make(3), 0).page).toBe(1);
	});
});

// readDocText guards before it touches disk: a traversal id or a non-markdown id never reads a file.
describe('readDocText', () => {
	it('refuses an id that decodes outside the root', async () => {
		expect(await readDocText('/srv/docs', idFor('../../etc/passwd.md'))).toBeUndefined();
	});

	it('refuses an id that does not name a markdown file', async () => {
		expect(await readDocText('/srv/docs', idFor('policy/secrets.env'))).toBeUndefined();
	});
});
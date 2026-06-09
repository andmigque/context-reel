//// # server/docs
//// The disk-backed doc source behind the ZapRail. Walks the doc root for markdown, addresses each doc
//// by an opaque id, pages the sorted list into fixed-size slices grouped by source path, and reads one
//// doc's text by id with a path-traversal guard. This module never reads `$env`; the route handler
//// passes the resolved root in, so the pure logic stays unit-testable.
////
//// ## Imports
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, relative, sep, posix } from 'node:path';
import type { Doc, DocMeta, DocPage, DocGroup } from '$lib/docs';

//// ## Constants

//// ### PAGE_SIZE
//// Rows per page. Fixed so paging is deterministic across requests.
export const PAGE_SIZE = 30;

//// ## Functions

//// ### idFor
//// Encode a doc's root-relative posix path into an opaque, URL-safe id.
export function idFor(relPath: string): string {
	//// **Parameters**
	//// - `string`: __relPath__
	////     - *The doc path relative to the root, in posix form.*
	//// **Returns**
	//// - `string`
	////     - *A base64url id that round-trips back through `pathFromId`.*
	return Buffer.from(relPath, 'utf8').toString('base64url');
}

//// ### pathFromId
//// Decode an opaque id back to a root-relative posix path, or undefined if it is not valid base64url.
export function pathFromId(id: string): string | undefined {
	//// **Parameters**
	//// - `string`: __id__
	////     - *The opaque id from a list row.*
	//// **Returns**
	//// - `string | undefined`
	////     - *The decoded relative path, or undefined when the id does not decode.*
	if (!/^[A-Za-z0-9_-]+$/.test(id)) return undefined;
	const decoded = Buffer.from(id, 'base64url').toString('utf8');
	return decoded.length > 0 ? decoded : undefined;
}

//// ### resolveWithinRoot
//// Resolve a root-relative path against the root and reject any result that escapes the root.
export function resolveWithinRoot(root: string, relPath: string): string | undefined {
	//// **Parameters**
	//// - `string`: __root__
	////     - *The absolute doc root.*
	//// - `string`: __relPath__
	////     - *The candidate relative path.*
	//// **Returns**
	//// - `string | undefined`
	////     - *The absolute path when it stays under the root, else undefined (path traversal).*
	const rootAbs = resolve(root);
	const target = resolve(rootAbs, relPath);
	if (target !== rootAbs && !target.startsWith(rootAbs + sep)) return undefined;
	return target;
}

//// ### pageDocs
//// Slice the sorted doc list into one page and group it by source path. Pure: no disk access.
export function pageDocs(all: DocMeta[], page: number, size: number = PAGE_SIZE): DocPage {
	//// **Parameters**
	//// - `DocMeta[]`: __all__
	////     - *The full list, pre-sorted by path then title.*
	//// - `number`: __page__
	////     - *The 1-based page number; values below 1 clamp to 1.*
	//// - `number`: __size__
	////     - *Rows per page; defaults to `PAGE_SIZE`.*
	//// **Returns**
	//// - `DocPage`
	////     - *The page's grouped rows and whether more pages remain.*
	const n = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
	const start = (n - 1) * size;
	const slice = all.slice(start, start + size);
	const groups: DocGroup[] = [];
	for (const doc of slice) {
		const tail = groups[groups.length - 1];
		if (tail && tail.path === doc.path) tail.docs.push(doc);
		else groups.push({ path: doc.path, docs: [doc] });
	}
	return { page: n, hasMore: start + size < all.length, groups };
}

//// ### listDocs
//// Walk the doc root for markdown files and return their metadata, sorted by path then title.
export async function listDocs(root: string): Promise<DocMeta[]> {
	//// **Parameters**
	//// - `string`: __root__
	////     - *The absolute doc root to scan.*
	//// **Returns**
	//// - `DocMeta[]`
	////     - *Every markdown doc under the root, sorted by source path then title.*
	const rootAbs = resolve(root);
	let rels: string[];
	try {
		const found = await readdir(rootAbs, { recursive: true, withFileTypes: true });
		rels = found
			.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
			.map((e) => relative(rootAbs, join(e.parentPath, e.name)));
	} catch {
		return [];
	}
	const metas: DocMeta[] = rels.map((rel) => {
		const relPosix = rel.split(sep).join(posix.sep);
		const dir = posix.dirname(relPosix);
		return { id: idFor(relPosix), title: posix.basename(relPosix), path: dir === '.' ? '' : dir };
	});
	metas.sort((a, b) => a.path.localeCompare(b.path) || a.title.localeCompare(b.title));
	return metas;
}

//// ### readDocText
//// Read one doc's text by id, guarding against path traversal. Returns undefined if the id is bad,
//// escapes the root, or names no file.
export async function readDocText(root: string, id: string): Promise<Doc | undefined> {
	//// **Parameters**
	//// - `string`: __root__
	////     - *The absolute doc root.*
	//// - `string`: __id__
	////     - *The opaque id from a list row.*
	//// **Returns**
	//// - `Doc | undefined`
	////     - *The doc with its text, or undefined when it cannot be served.*
	const relPath = pathFromId(id);
	if (relPath === undefined) return undefined;
	const relPosix = relPath.split(sep).join(posix.sep);
	if (!relPosix.toLowerCase().endsWith('.md')) return undefined;
	const target = resolveWithinRoot(root, relPath);
	if (target === undefined) return undefined;
	try {
		const text = await readFile(target, 'utf8');
		const dir = posix.dirname(relPosix);
		return { id, title: posix.basename(relPosix), path: dir === '.' ? '' : dir, text };
	} catch {
		return undefined;
	}
}
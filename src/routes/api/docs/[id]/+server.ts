import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readDocText } from '$lib/server/docs';
import { docRoot } from '$lib/server/root';

/**
 * The doc-source text seam. Returns one doc's markdown body by its opaque id. The id decodes to a
 * root-relative path that must stay under the doc root; a bad id, a path that escapes the root, or a
 * missing file all answer 404. The text is untrusted markdown — the editor and renderers sanitize it
 * before display.
 */
export const GET: RequestHandler = async ({ params }) => {
	const doc = await readDocText(docRoot(), params.id ?? '');
	if (doc === undefined) error(404, 'No such doc.');
	return json(doc);
};
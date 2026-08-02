//// # api/docs
//// The doc-source list seam. Returns one page of doc metadata, grouped by source path, for the ZapRail
//// to render and page through. Rows carry id, title, and path only — never text; the body loads from
//// the sibling /api/docs/[id] endpoint on activate.
////
//// ## Imports
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listDocs, pageDocs } from '$lib/server/docs';
import { docRoot } from '$lib/server/root';

//// ## Handlers

//// ### GET
//// Answer one page of the doc list. The page number is a 1-based query param; an absent or invalid
//// value reads as page 1.
export const GET: RequestHandler = async ({ url }) => {
	const page = Number(url.searchParams.get('page') ?? '1');
	const all = await listDocs(docRoot());
	return json(pageDocs(all, page));
};
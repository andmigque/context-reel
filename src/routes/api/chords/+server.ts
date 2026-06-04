import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CHORD_BINDINGS } from '$lib/chords/registry';

/**
 * The chord seam. This endpoint is the only door the page knocks on for the
 * chord set; it returns the rows through the registry (the service/repository
 * stand-in). The row shape mirrors the inline set the client keymap reads, so
 * the two never drift.
 */
export const GET: RequestHandler = () => {
	return json({ bindings: CHORD_BINDINGS });
};

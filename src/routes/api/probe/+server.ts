import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { ModelStatus } from '$lib/types';

interface ProbeBody {
	vendor: string;
	envVarName: string;
}

interface ProbeResult {
	status: Extract<ModelStatus, 'ready' | 'error'>;
	/** Names the env var, never its value. Safe to show and to log. */
	reason: string;
}

/**
 * Probe a configured model's reachability using the key in its named env var. If the env
 * var is unset on the server, the probe reports error (Config spec).
 *
 * The key value never leaves the server and is never placed in the response —
 * only the env var *name* and a pass/fail verdict travel back.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as ProbeBody;
	const name = body.envVarName?.trim() ?? '';

	if (name === '') {
		const result: ProbeResult = { status: 'error', reason: 'No env var named on this model.' };
		return json(result);
	}

	const key = env[name];
	if (key === undefined || key.trim() === '') {
		const result: ProbeResult = { status: 'error', reason: `${name} is unset on the server.` };
		return json(result);
	}

	// Mock probe: a present key reads as reachable. A real probe slots in here —
	// a cheap models call or a health endpoint — using `key`, never returning it.
	const result: ProbeResult = { status: 'ready', reason: `${name} is set; ${body.vendor} looks reachable.` };
	return json(result);
};

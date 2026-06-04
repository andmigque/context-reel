import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { StreamRequest } from '$lib/chat/stream';

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a synthetic answer from the posted transcript alone. The server keeps
 * nothing between requests — everything it knows rode in with this body.
 */
function mockAnswer(req: StreamRequest): string {
	const lastUser = [...req.turns].reverse().find((t) => t.role === 'user');
	const echo = lastUser ? lastUser.content.trim().slice(0, 200) : '(no prompt)';
	return [
		`Streaming live from **${req.vendor}** \`${req.model}\`, token by token — no blank pause.`,
		'',
		'> ' + echo.replace(/\n+/g, ' '),
		'',
		'A few things this proves, as it arrives:',
		'',
		'- the server held no state — your whole transcript rode in with this one request',
		'- each token is flushed the moment it is made, then appended within a frame',
		'- a caret blinks at the tail until the stream closes',
		'',
		'```ts',
		'// the seam, in one line',
		'const answer = stream(transcript); // pure function, transcript -> tokens',
		'```',
		'',
		'That is the whole shape of it.'
	].join('\n');
}

/**
 * The stateless stream. Reads the full transcript from the body, returns tokens
 * as NDJSON (one event per line). Mock by default; a real backend slots in where
 * marked once a vendor key is wired.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as StreamRequest;
	const useMock = env.CADENCE_MOCK_STREAM !== 'false';
	const encoder = new TextEncoder();
	let cancelled = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (event: unknown) => {
				if (cancelled) return;
				controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
			};

			try {
				if (useMock) {
					await delay(350); // a believable time-to-first-token
					const answer = mockAnswer(body);
					const tokens = answer.match(/\S+\s*|\s+/g) ?? [answer];
					for (const token of tokens) {
						if (cancelled) break;
						send({ type: 'token', value: token });
						await delay(26);
					}
				} else {
					// ── Real vendor streaming slots in here ──────────────────────────
					// const key = env[body.envVarName]; call the vendor SDK; relay tokens.
					// Until a backend is wired, fail honestly rather than fake a stream.
					send({
						type: 'error',
						message: `No live backend wired for ${body.vendor} yet. Set CADENCE_MOCK_STREAM=true to stream the mock.`
					});
				}
				if (!cancelled) send({ type: 'done' });
			} catch (err) {
				send({ type: 'error', message: err instanceof Error ? err.message : 'stream error' });
			} finally {
				try {
					controller.close();
				} catch {
					// already closed by a cancel; nothing to do
				}
			}
		},
		cancel() {
			cancelled = true; // client pressed Stop or navigated away
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'application/x-ndjson',
			'cache-control': 'no-store',
			'x-accel-buffering': 'no'
		}
	});
};

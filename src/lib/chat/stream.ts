import type { TranscriptTurn, Vendor } from '$lib/types';

/** Everything the stateless server needs to answer one turn. */
export interface StreamRequest {
	vendor: Vendor;
	model: string;
	envVarName: string;
	systemPrompt: string;
	turns: TranscriptTurn[];
}

/** One framed event off the wire (NDJSON, one object per line). */
export type StreamEvent =
	| { type: 'token'; value: string }
	| { type: 'done' }
	| { type: 'error'; message: string };

export interface StreamCallbacks {
	onToken: (value: string) => void;
	onDone: () => void;
	onError: (message: string) => void;
}

export interface StreamHandle {
	/** Cancel the stream. Keeps whatever tokens already arrived; not an error. */
	abort: () => void;
}

/**
 * Open a streaming POST to /api/chat and dispatch each token as it lands. The
 * whole transcript rides in the body; the server holds nothing between calls.
 *
 * An abort (Stop) resolves silently — it is a user action, not a failure.
 */
export function streamChat(request: StreamRequest, cb: StreamCallbacks): StreamHandle {
	const controller = new AbortController();

	(async () => {
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(request),
				signal: controller.signal
			});
			if (!res.ok || res.body === null) {
				throw new Error(`stream failed: ${res.status}`);
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				let newline = buffer.indexOf('\n');
				while (newline >= 0) {
					const line = buffer.slice(0, newline).trim();
					buffer = buffer.slice(newline + 1);
					newline = buffer.indexOf('\n');
					if (line.length === 0) continue;

					const event = JSON.parse(line) as StreamEvent;
					if (event.type === 'token') cb.onToken(event.value);
					else if (event.type === 'done') cb.onDone();
					else if (event.type === 'error') cb.onError(event.message);
				}
			}
		} catch (err) {
			if (controller.signal.aborted) return; // Stop, not a defect.
			cb.onError(err instanceof Error ? err.message : 'stream error');
		}
	})();

	return { abort: () => controller.abort() };
}

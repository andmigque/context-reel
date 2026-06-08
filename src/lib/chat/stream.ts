//// # stream
//// The client transport for chat. Opens a streaming POST to /api/chat, frames NDJSON events off the
//// wire, and dispatches each token as it lands. The whole transcript rides in the body; the server
//// holds nothing between calls.
////
//// ## Imports
import type { TranscriptTurn, Vendor } from '$lib/types';

//// ## Types

//// ### StreamRequest
//// Everything the stateless server needs to answer one turn.
export interface StreamRequest {
	//// - `Vendor`: __vendor__
	////     - *The model family to answer with.*
	//// - `string`: __model__
	////     - *Provider model id.*
	//// - `string`: __envVarName__
	////     - *Name of the env var holding the provider key.*
	//// - `string`: __systemPrompt__
	////     - *System prompt for this model.*
	//// - `TranscriptTurn[]`: __turns__
	////     - *The full conversation so far.*
	vendor: Vendor;
	model: string;
	envVarName: string;
	systemPrompt: string;
	turns: TranscriptTurn[];
}

//// ### StreamEvent
//// One framed event off the wire (NDJSON, one object per line).
export type StreamEvent =
	| { type: 'token'; value: string }
	| { type: 'done' }
	| { type: 'error'; message: string };

//// ### StreamCallbacks
//// The caller's handlers for token, done, and error events.
export interface StreamCallbacks {
	//// - `(value: string) => void`: __onToken__
	////     - *Called with each token as it arrives.*
	//// - `() => void`: __onDone__
	////     - *Called once the stream completes.*
	//// - `(message: string) => void`: __onError__
	////     - *Called with an error message on failure.*
	onToken: (value: string) => void;
	onDone: () => void;
	onError: (message: string) => void;
}

//// ### StreamHandle
//// A handle to a running stream.
export interface StreamHandle {
	//// - `() => void`: __abort__
	////     - *Cancel the stream. Keeps whatever tokens already arrived; not an error.*
	abort: () => void;
}

//// ## Functions

//// ### streamChat
//// Open a streaming POST to /api/chat and dispatch each token as it lands. The whole transcript rides
//// in the body; the server holds nothing between calls. An abort (Stop) resolves silently — it is a
//// user action, not a failure.
export function streamChat(request: StreamRequest, cb: StreamCallbacks): StreamHandle {
	//// **Parameters**
	//// - `StreamRequest`: __request__
	////     - *The model and transcript to answer.*
	//// - `StreamCallbacks`: __cb__
	////     - *Token, done, and error handlers.*
	//// **Returns**
	//// - `StreamHandle`
	////     - *A handle whose `abort()` cancels the stream.*
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
			if (controller.signal.aborted) return; //// Stop, not a defect.
			cb.onError(err instanceof Error ? err.message : 'stream error');
		}
	})();

	return { abort: () => controller.abort() };
}

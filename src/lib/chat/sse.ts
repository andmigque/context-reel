//// # chat/sse
//// Frame a provider's Server-Sent Events stream into decoded JSON payloads.
////
//// Providers do not agree on the bytes that terminate an event: the grammar allows LF LF, CRLF CRLF,
//// and CR CR, and each provider picks one. A scanner that recognizes a single form never finds a
//// boundary in the others, buffers the whole response instead of streaming it, and then hands every
//// event to one `JSON.parse` call — which reads the first object and throws on the second.
////
//// Kept apart from the route handler so the framing stays unit-testable.
////
//// ## Constants

//// ### EVENT_BOUNDARIES
//// Every event terminator the SSE grammar permits, longest first so a CRLF pair is never consumed as
//// a shorter boundary that leaves half of it behind.
const EVENT_BOUNDARIES = ['\r\n\r\n', '\n\n', '\r\r'];

//// ## Functions

//// ### findBoundary
//// Locate the earliest event terminator in a buffer, preferring the longest match at that position.
export function findBoundary(buffer: string): { index: number; length: number } | undefined {
	//// **Parameters**
	//// - `string`: __buffer__
	////     - *The bytes decoded so far.*
	//// **Returns**
	//// - `{ index: number; length: number } | undefined`
	////     - *Where the terminator starts and how long it is, or undefined when the buffer holds no
	////       complete event yet.*
	let found: { index: number; length: number } | undefined;
	for (const marker of EVENT_BOUNDARIES) {
		const index = buffer.indexOf(marker);
		if (index === -1) continue;
		//// A terminator split across two chunks simply is not found this pass; the next chunk
		//// completes it, so waiting is correct and loses nothing.
		if (found === undefined || index < found.index) found = { index, length: marker.length };
	}
	return found;
}

//// ### parseSseEvent
//// Decode one raw event block. Per the SSE grammar an event may carry several `data:` lines, which
//// join with a newline to form one payload. Comments and field lines that are not `data:` are ignored,
//// and a terminator sentinel yields nothing.
export function parseSseEvent(raw: string): unknown | undefined {
	//// **Parameters**
	//// - `string`: __raw__
	////     - *One event block, terminator already stripped.*
	//// **Returns**
	//// - `unknown | undefined`
	////     - *The decoded payload, or undefined for an empty event or the `[DONE]` sentinel.*
	const data = raw
		.split(/\r\n|\n|\r/)
		.filter((line) => line.startsWith('data:'))
		.map((line) => line.slice(5).trim())
		.join('\n');

	if (data.length === 0 || data === '[DONE]') return undefined;
	return JSON.parse(data);
}

//// ### readSse
//// Read a provider response, handing each event's payload to `onEvent` as it arrives.
export async function readSse(res: Response, onEvent: (event: any) => void): Promise<void> {
	//// **Parameters**
	//// - `Response`: __res__
	////     - *The provider response; its body must be a readable stream.*
	//// - `(event: any) => void`: __onEvent__
	////     - *Called once per decoded event payload.*
	if (res.body === null) throw new Error('Provider returned no stream.');

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		for (let at = findBoundary(buffer); at !== undefined; at = findBoundary(buffer)) {
			const raw = buffer.slice(0, at.index);
			buffer = buffer.slice(at.index + at.length);
			emit(raw, onEvent);
		}
	}

	//// A final event may arrive without a trailing terminator.
	if (buffer.trim().length > 0) emit(buffer, onEvent);
}

//// ### emit
//// Decode one block and forward it, skipping the blocks that carry no payload.
function emit(raw: string, onEvent: (event: any) => void): void {
	//// **Parameters**
	//// - `string`: __raw__
	////     - *One event block.*
	//// - `(event: any) => void`: __onEvent__
	////     - *Called only when the block decodes to a payload.*
	const payload = parseSseEvent(raw);
	if (payload !== undefined) onEvent(payload);
}

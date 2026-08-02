import { describe, it, expect } from 'vitest';
import { readSse, findBoundary, parseSseEvent } from './sse';

/**
 * The framing, not the payloads. Gemini answers were failing with "Unexpected
 * non-whitespace character after JSON at position N (line 2 column 1)" because
 * the scanner knew only the LF LF terminator: a CRLF stream never yielded a
 * boundary, the whole response buffered, and the final flush handed every event
 * to one JSON.parse. Each terminator the grammar allows gets a case here.
 */

/** A response whose body streams `chunks` as UTF-8, like a provider would. */
function responseOf(chunks: string[]): Response {
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		}
	});
	return new Response(body);
}

/** Three provider events, joined by the given terminator. */
function stream(terminator: string): string {
	return [1, 2, 3].map((n) => `data: ${JSON.stringify({ n })}`).join(terminator) + terminator;
}

async function collect(chunks: string[]): Promise<unknown[]> {
	const events: unknown[] = [];
	await readSse(responseOf(chunks), (event) => events.push(event));
	return events;
}

describe('readSse', () => {
	for (const [name, terminator] of [
		['LF LF', '\n\n'],
		['CRLF CRLF', '\r\n\r\n'],
		['CR CR', '\r\r']
	] as const) {
		it(`emits one payload per event on a ${name} stream`, async () => {
			expect(await collect([stream(terminator)])).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
		});
	}

	it('emits during the stream rather than buffering to the end', async () => {
		// The regression was silent before it threw: nothing reached the client
		// until the response completed, so the answer could never stream.
		const seen: unknown[] = [];
		let emittedBeforeSecondChunk = -1;
		const encoder = new TextEncoder();
		// Pull-driven: the second chunk is produced only once the consumer asks for
		// more, which it does only after the first has been read and handled.
		let pulls = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulls += 1;
				if (pulls === 1) controller.enqueue(encoder.encode('data: {"n":1}\r\n\r\n'));
				else if (pulls === 2) {
					emittedBeforeSecondChunk = seen.length;
					controller.enqueue(encoder.encode('data: {"n":2}\r\n\r\n'));
				} else controller.close();
			}
		});
		await readSse(new Response(body), (event) => seen.push(event));
		expect(emittedBeforeSecondChunk).toBe(1);
		expect(seen).toHaveLength(2);
	});

	it('joins a terminator split across two chunks', async () => {
		expect(await collect(['data: {"n":1}\r\n', '\r\ndata: {"n":2}\r\n\r\n'])).toEqual([
			{ n: 1 },
			{ n: 2 }
		]);
	});

	it('emits a final event that arrives with no terminator', async () => {
		expect(await collect(['data: {"n":1}\n\ndata: {"n":2}'])).toEqual([{ n: 1 }, { n: 2 }]);
	});

	it('throws when the response carries no stream', async () => {
		await expect(readSse(new Response(null), () => {})).rejects.toThrow(/no stream/);
	});
});

describe('parseSseEvent', () => {
	it('joins the several data lines of one event into a single payload', () => {
		expect(parseSseEvent('data: {"a":1,\ndata: "b":2}')).toEqual({ a: 1, b: 2 });
	});

	it('yields nothing for the done sentinel', () => {
		expect(parseSseEvent('data: [DONE]')).toBeUndefined();
	});

	it('yields nothing for an event carrying only a comment', () => {
		expect(parseSseEvent(': keep-alive')).toBeUndefined();
	});

	it('ignores fields that are not data', () => {
		expect(parseSseEvent('event: message\nid: 7\ndata: {"n":1}')).toEqual({ n: 1 });
	});
});

describe('findBoundary', () => {
	it('reports no boundary while the buffer holds a partial terminator', () => {
		expect(findBoundary('data: {"n":1}\r\n')).toBeUndefined();
	});

	it('consumes a CRLF terminator whole', () => {
		expect(findBoundary('ab\r\n\r\ncd')).toEqual({ index: 2, length: 4 });
	});
});

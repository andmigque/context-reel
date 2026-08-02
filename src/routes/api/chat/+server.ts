import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { StreamRequest } from '$lib/chat/stream';
import { readSse } from '$lib/chat/sse';
import type { TranscriptTurn, Vendor } from '$lib/types';

type Send = (event: { type: 'token'; value: string } | { type: 'done' } | { type: 'error'; message: string }) => void;

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as StreamRequest;
	const encoder = new TextEncoder();
	let cancelled = false;

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send: Send = (event) => {
				if (cancelled) return;
				controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
			};

			try {
				const key = readProviderKey(body.envVarName);
				await streamProvider(body, key, request.signal, send);
				if (!cancelled) send({ type: 'done' });
			} catch (err) {
				send({ type: 'error', message: err instanceof Error ? err.message : 'stream error' });
			} finally {
				try {
					controller.close();
				} catch {
					// already closed by cancel
				}
			}
		},
		cancel() {
			cancelled = true;
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

function readProviderKey(envVarName: string): string {
	const name = envVarName.trim();
	if (name === '') throw new Error('Provider key env var name is required.');

	const value = env[name];
	if (value === undefined || value.trim() === '') {
		throw new Error(`${name} environment variable is required.`);
	}

	return value;
}

async function streamProvider(body: StreamRequest, key: string, signal: AbortSignal, send: Send): Promise<void> {
	switch (body.vendor) {
		case 'claude':
			await streamAnthropic(body, key, signal, send);
			return;
		case 'gpt':
			await streamOpenAICompatible('https://api.openai.com/v1/chat/completions', body, key, signal, send);
			return;
		case 'grok':
			await streamOpenAICompatible('https://api.x.ai/v1/chat/completions', body, key, signal, send);
			return;
		case 'gemini':
			await streamGemini(body, key, signal, send);
			return;
	}
}

async function streamOpenAICompatible(
	url: string,
	body: StreamRequest,
	key: string,
	signal: AbortSignal,
	send: Send
): Promise<void> {
	const res = await fetch(url, {
		method: 'POST',
		signal,
		headers: {
			authorization: `Bearer ${key}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			model: body.model,
			stream: true,
			messages: toOpenAIMessages(body.systemPrompt, body.turns)
		})
	});

	await requireOk(res);
	await readSse(res, (event) => {
		const token = event?.choices?.[0]?.delta?.content;
		if (typeof token === 'string' && token.length > 0) send({ type: 'token', value: token });
	});
}

async function streamAnthropic(body: StreamRequest, key: string, signal: AbortSignal, send: Send): Promise<void> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		signal,
		headers: {
			'x-api-key': key,
			'anthropic-version': '2023-06-01',
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			model: body.model,
			max_tokens: 4096,
			stream: true,
			system: body.systemPrompt.trim() || undefined,
			messages: toAnthropicMessages(body.turns)
		})
	});

	await requireOk(res);
	await readSse(res, (event) => {
		const token = event?.delta?.text;
		if (typeof token === 'string' && token.length > 0) send({ type: 'token', value: token });
	});
}

async function streamGemini(body: StreamRequest, key: string, signal: AbortSignal, send: Send): Promise<void> {
	const model = encodeURIComponent(body.model);
	const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
		method: 'POST',
		signal,
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			systemInstruction: body.systemPrompt.trim()
				? { parts: [{ text: body.systemPrompt.trim() }] }
				: undefined,
			contents: toGeminiContents(body.turns)
		})
	});

	await requireOk(res);
	await readSse(res, (event) => {
		const parts = event?.candidates?.[0]?.content?.parts;
		if (!Array.isArray(parts)) return;
		for (const part of parts) {
			const token = part?.text;
			if (typeof token === 'string' && token.length > 0) send({ type: 'token', value: token });
		}
	});
}

function toOpenAIMessages(systemPrompt: string, turns: TranscriptTurn[]): Array<{ role: string; content: string }> {
	const messages = systemPrompt.trim().length > 0 ? [{ role: 'system', content: systemPrompt.trim() }] : [];
	return [
		...messages,
		...turns.map((turn) => ({
			role: turn.role === 'assistant' ? 'assistant' : 'user',
			content: turn.content
		}))
	];
}

function toAnthropicMessages(turns: TranscriptTurn[]): Array<{ role: 'user' | 'assistant'; content: string }> {
	return coalesceTurns(
		turns.map((turn) => ({
			role: turn.role === 'assistant' ? 'assistant' : 'user',
			content: turn.content
		}))
	);
}

function toGeminiContents(turns: TranscriptTurn[]): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
	return coalesceTurns(
		turns.map((turn) => ({
			role: turn.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: turn.content }]
		}))
	);
}

function coalesceTurns<T extends { role: string }>(turns: T[]): T[] {
	const result: T[] = [];
	for (const turn of turns) {
		const last = result.at(-1);
		if (!last || last.role !== turn.role) {
			result.push(turn);
			continue;
		}

		if ('content' in last && 'content' in turn && typeof last.content === 'string' && typeof turn.content === 'string') {
			last.content = `${last.content}\n\n${turn.content}`;
		} else if ('parts' in last && 'parts' in turn && Array.isArray(last.parts) && Array.isArray(turn.parts)) {
			last.parts.push(...turn.parts);
		}
	}
	return result;
}

async function requireOk(res: Response): Promise<void> {
	if (res.ok) return;
	const text = await res.text();
	throw new Error(text || `Provider request failed: ${res.status}`);
}


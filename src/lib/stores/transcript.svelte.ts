import { browser } from '$app/environment';
import { getDb, tick } from './db';
import type { Message, Role, TranscriptTurn, TurnState, Vendor } from '$lib/types';

/**
 * The conversation. The client holds the whole thing and replays it to the
 * stateless server every turn (Chat spec). Home is the IndexedDB `transcript`
 * store, so a reload keeps the thread.
 */
class TranscriptStore {
	messages = $state<Message[]>([]);
	loaded = $state(false);

	async load(): Promise<void> {
		if (!browser || this.loaded) return;
		const db = await getDb();
		const rows = await db.getAll('transcript');
		this.messages = rows.sort((a, b) => a.id - b.id);
		this.loaded = true;
	}

	/** Append a new turn and return it. */
	append(role: Role, text: string, vendor: Vendor | '' = '', state: TurnState = 'complete'): Message {
		const message: Message = {
			id: tick(),
			role,
			vendor,
			text,
			state,
			ttftMs: 0,
			tokenCount: 0,
			createdAt: Date.now()
		};
		this.messages = [...this.messages, message];
		this.#persist(message);
		return message;
	}

	/** Patch a turn in place (token appends, state changes, metrics). */
	patch(id: number, change: Partial<Message>): void {
		let touched: Message | undefined;
		this.messages = this.messages.map((m) => {
			if (m.id !== id) return m;
			touched = { ...m, ...change };
			return touched;
		});
		if (touched) this.#persist(touched);
	}

	/** Shape the conversation for the stream endpoint. */
	toTurns(): TranscriptTurn[] {
		return this.messages
			.filter((m) => m.text.length > 0)
			.map((m) => ({ role: m.role, content: m.text }));
	}

	async #persist(message: Message): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		await db.put('transcript', $state.snapshot(message));
	}
}

export const transcript = new TranscriptStore();

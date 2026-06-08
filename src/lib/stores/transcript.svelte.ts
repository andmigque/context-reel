//// # transcript (store)
//// The conversation. The client holds the whole thing and replays it to the stateless server every
//// turn (Chat spec). Home is the IndexedDB `transcript` store, so a reload keeps the thread.
////
//// ## Imports
import { browser } from '$app/environment';
import { getDb, tick } from './db';
import type { Message, Role, TranscriptTurn, TurnState, Vendor } from '$lib/types';

//// ## TranscriptStore

//// ### TranscriptStore
//// The shared conversation. Holds the reactive message list and persists each turn to IndexedDB.
class TranscriptStore {
	//// - `Message[]`: __messages__
	////     - *The reactive conversation the chat renders.*
	messages = $state<Message[]>([]);
	//// - `boolean`: __loaded__
	////     - *True once the saved thread has been read from IndexedDB.*
	loaded = $state(false);

	//// ### load
	//// Read the saved thread from the `transcript` store, sorted oldest first. Browser-only; no-op once
	//// loaded.
	async load(): Promise<void> {
		if (!browser || this.loaded) return;
		const db = await getDb();
		const rows = await db.getAll('transcript');
		this.messages = rows.sort((a, b) => a.id - b.id);
		this.loaded = true;
	}

	//// ### append
	//// Append a new turn and return it.
	append(role: Role, text: string, vendor: Vendor | '' = '', state: TurnState = 'complete'): Message {
		//// **Parameters**
		//// - `Role`: __role__
		////     - *User or assistant.*
		//// - `string`: __text__
		////     - *The turn's content.*
		//// - `Vendor | ''`: __vendor__
		////     - *Producing model for assistant turns; '' for user turns.*
		//// - `TurnState`: __state__
		////     - *Initial lifecycle state; defaults to 'complete'.*
		//// **Returns**
		//// - `Message`
		////     - *The appended turn, also persisted.*
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

	//// ### patch
	//// Patch a turn in place (token appends, state changes, metrics).
	patch(id: number, change: Partial<Message>): void {
		//// **Parameters**
		//// - `number`: __id__
		////     - *Id of the turn to patch.*
		//// - `Partial<Message>`: __change__
		////     - *The fields to merge.*
		let touched: Message | undefined;
		this.messages = this.messages.map((m) => {
			if (m.id !== id) return m;
			touched = { ...m, ...change };
			return touched;
		});
		if (touched) this.#persist(touched);
	}

	//// ### toTurns
	//// Shape the conversation for the stream endpoint, dropping empty turns.
	toTurns(): TranscriptTurn[] {
		//// **Returns**
		//// - `TranscriptTurn[]`
		////     - *Role/content turns with text, ready to post to the server.*
		return this.messages
			.filter((m) => m.text.length > 0)
			.map((m) => ({ role: m.role, content: m.text }));
	}

	//// ### #persist
	//// Persist one message to the `transcript` store (browser only).
	async #persist(message: Message): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		await db.put('transcript', $state.snapshot(message));
	}
}

//// ## Singleton
//// The shared conversation instance imported across the app.
export const transcript = new TranscriptStore();

//// # db
//// The ContextReel database. One database, two stores, both keyed by a tick stamp: the `config` store
//// the roster writes and the chat reads, and the `transcript` store the client owns and replays to the
//// stateless server. The editor's working doc lives in localStorage (the spec's "today" home), not here.
////
//// ## Imports
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ConfiguredModel, Message } from '$lib/types';

//// ## Types

//// ### ContextReelDB
//// The IndexedDB schema: a `config` store of roster rows and a `transcript` store of messages, each
//// keyed by a numeric tick stamp.
interface ContextReelDB extends DBSchema {
	config: {
		key: number;
		value: ConfiguredModel;
	};
	transcript: {
		key: number;
		value: Message;
	};
}

//// ## Internals
//// `DB_NAME` and `DB_VERSION` name and version the database; `dbPromise` caches the open connection.
const DB_NAME = 'context-reel';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ContextReelDB>> | undefined;

//// ## Functions

//// ### getDb
//// Open (and cache) the database. Browser-only; callers gate on `browser`.
export function getDb(): Promise<IDBPDatabase<ContextReelDB>> {
	//// **Returns**
	//// - `Promise<IDBPDatabase<ContextReelDB>>`
	////     - *The cached database promise; opens the DB and creates stores on first call.*
	if (dbPromise === undefined) {
		dbPromise = openDB<ContextReelDB>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('config')) {
					db.createObjectStore('config', { keyPath: 'id' });
				}
				if (!db.objectStoreNames.contains('transcript')) {
					db.createObjectStore('transcript', { keyPath: 'id' });
				}
			}
		});
	}
	return dbPromise;
}

//// ### tick
//// A monotonic tick stamp used as a store key. `Date.now()` can repeat within a millisecond, so we
//// nudge forward to keep keys strictly increasing per session.
let lastTick = 0;
export function tick(): number {
	//// **Returns**
	//// - `number`
	////     - *A strictly increasing tick stamp for use as a store key.*
	const now = Date.now();
	lastTick = now > lastTick ? now : lastTick + 1;
	return lastTick;
}

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ConfiguredModel, Message } from '$lib/types';

/**
 * The ContextReel database. One database, two stores, both keyed by a tick stamp:
 *   - config:     the roster Config writes and the chat reads.
 *   - transcript: the conversation the client owns and replays to the stateless server.
 *
 * The editor's working doc lives in localStorage (the spec's "today" home), not here.
 */
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

const DB_NAME = 'context-reel';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ContextReelDB>> | undefined;

/** Open (and cache) the database. Browser-only; callers gate on `browser`. */
export function getDb(): Promise<IDBPDatabase<ContextReelDB>> {
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

/**
 * A monotonic tick stamp used as a store key. Date.now() can repeat within a
 * millisecond, so we nudge forward to keep keys strictly increasing per session.
 */
let lastTick = 0;
export function tick(): number {
	const now = Date.now();
	lastTick = now > lastTick ? now : lastTick + 1;
	return lastTick;
}

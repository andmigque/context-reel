import { browser } from '$app/environment';
import { getDb, tick } from './db';
import { defaultRoster, VENDOR_META } from '$lib/vendors/defaults';
import type { Agent, AgentStatus, Vendor } from '$lib/types';

/**
 * The roster store. Config is the *only* writer (Config spec); the chat imports
 * the same singleton and reads `agents` / `active`, never mutating them.
 *
 * Persistence is the IndexedDB `config` store, keyed by each agent's tick stamp.
 * Removing an agent clears its active flag and parks it offline — the row is
 * never deleted, so nothing is truly lost.
 */
class ConfigStore {
	agents = $state<Agent[]>([]);
	loaded = $state(false);
	#loading: Promise<void> | undefined;

	/** The agent that leads the chat, if any. */
	get active(): Agent | undefined {
		return this.agents.find((a) => a.active);
	}

	/**
	 * Load the roster, seeding the default vendors on first run.
	 *
	 * Chat and Config both mount at once and both call this; a single in-flight
	 * promise makes concurrent callers share one load, so the empty store is
	 * never seeded twice.
	 */
	load(): Promise<void> {
		if (!browser || this.loaded) return Promise.resolve();
		if (this.#loading === undefined) this.#loading = this.#load();
		return this.#loading;
	}

	async #load(): Promise<void> {
		const db = await getDb();
		let rows = await db.getAll('config');
		if (rows.length === 0) {
			const seeded = defaultRoster(tick());
			const txn = db.transaction('config', 'readwrite');
			for (const agent of seeded) await txn.store.put(agent);
			await txn.done;
			rows = seeded;
		}
		this.agents = rows.sort((a, b) => a.id - b.id);
		this.loaded = true;
	}

	async add(vendor: Vendor): Promise<Agent> {
		const meta = VENDOR_META[vendor];
		const agent: Agent = {
			id: tick(),
			vendor,
			display: meta.label,
			model: meta.defaultModel,
			status: meta.wired ? 'ready' : 'offline',
			envVarName: meta.envVarName,
			systemPrompt: '',
			description: '',
			active: false,
			userId: ''
		};
		await this.#put(agent);
		this.agents = [...this.agents, agent];
		return agent;
	}

	async update(id: number, patch: Partial<Agent>): Promise<void> {
		const next = this.agents.map((a) => (a.id === id ? { ...a, ...patch } : a));
		const updated = next.find((a) => a.id === id);
		if (updated) await this.#put(updated);
		this.agents = next;
	}

	/** Make one agent the lead. Demotes the previous lead from 'active' to 'ready'. */
	async setActive(id: number): Promise<void> {
		const next = this.agents.map<Agent>((a) => {
			if (a.id === id) return { ...a, active: true, status: 'active' };
			const status: AgentStatus = a.status === 'active' ? 'ready' : a.status;
			return { ...a, active: false, status };
		});
		this.agents = next;
		await this.#putAll(next);
	}

	/** Remove = clear the active flag and park offline. The row stays in the store. */
	async remove(id: number): Promise<void> {
		await this.update(id, { active: false, status: 'offline' });
	}

	/** Apply a probe result without touching anything but status. */
	async setStatus(id: number, status: AgentStatus): Promise<void> {
		await this.update(id, { status });
	}

	async #put(agent: Agent): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		await db.put('config', $state.snapshot(agent));
	}

	async #putAll(agents: Agent[]): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		const txn = db.transaction('config', 'readwrite');
		for (const agent of agents) await txn.store.put($state.snapshot(agent));
		await txn.done;
	}
}

export const config = new ConfigStore();

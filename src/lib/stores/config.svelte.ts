import { browser } from '$app/environment';
import { getDb, tick } from './db';
import { defaultRoster, VENDOR_META } from '$lib/vendors/defaults';
import type { ConfiguredModel, ModelStatus, Vendor } from '$lib/types';

type StoredModel = Omit<ConfiguredModel, 'status'> & {
	active?: boolean;
	status: ModelStatus | 'active';
};

const LEGACY_DESCRIPTIONS = new Set([
	'Leads the swarm. Streams the first answer.',
	'Leads the . Streams the first answer.',
	'Selected first. Streams the first answer.',
	'Fast second voice in the roster.',
	'In the roster, waiting for a provider key.'
]);

/**
 * The roster store. Config is the only writer; chat reads the same singleton.
 *
 * Persistence is the IndexedDB `config` store, keyed by each model row's tick stamp.
 * Removing a model clears its selected flag and parks it offline. The row stays.
 */
class ConfigStore {
	models = $state<ConfiguredModel[]>([]);
	loaded = $state(false);
	#loading: Promise<void> | undefined;

	/** The selected model, if any. */
	get selected(): ConfiguredModel | undefined {
		return this.models.find((model) => model.selected);
	}

	/**
	 * Load the roster, seeding the default providers on first run.
	 *
	 * Chat and Config both mount at once and both call this. A single in-flight
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
			for (const model of seeded) await txn.store.put(model);
			await txn.done;
			rows = seeded;
		}
		const normalized = rows.map((row) => normalizeStoredModel(row as StoredModel));
		this.models = normalized.sort((a, b) => a.id - b.id);
		await this.#putAll(this.models);
		this.loaded = true;
	}

	async add(vendor: Vendor): Promise<ConfiguredModel> {
		const meta = VENDOR_META[vendor];
		const model: ConfiguredModel = {
			id: tick(),
			vendor,
			display: meta.label,
			model: meta.defaultModel,
			status: 'ready',
			envVarName: meta.envVarName,
			systemPrompt: '',
			description: '',
			selected: false,
			userId: ''
		};
		await this.#put(model);
		this.models = [...this.models, model];
		return model;
	}

	async update(id: number, patch: Partial<ConfiguredModel>): Promise<void> {
		const next = this.models.map((model) => (model.id === id ? { ...model, ...patch } : model));
		const updated = next.find((model) => model.id === id);
		if (updated) await this.#put(updated);
		this.models = next;
	}

	/** Select one model. Returns the previous selected row to ready. */
	async setSelected(id: number): Promise<void> {
		const next = this.models.map<ConfiguredModel>((model) => {
			if (model.id === id) return { ...model, selected: true, status: 'selected' };
			const status: ModelStatus = model.status === 'selected' ? 'ready' : model.status;
			return { ...model, selected: false, status };
		});
		this.models = next;
		await this.#putAll(next);
	}

	/** Remove means clear the selected flag and park offline. The row stays. */
	async remove(id: number): Promise<void> {
		await this.update(id, { selected: false, status: 'offline' });
	}

	/** Apply a probe result without touching anything but status. */
	async setStatus(id: number, status: ModelStatus): Promise<void> {
		const model = this.models.find((row) => row.id === id);
		await this.update(id, { status: model?.selected && status === 'ready' ? 'selected' : status });
	}

	async #put(model: ConfiguredModel): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		await db.put('config', $state.snapshot(model));
	}

	async #putAll(models: ConfiguredModel[]): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		const txn = db.transaction('config', 'readwrite');
		for (const model of models) await txn.store.put($state.snapshot(model));
		await txn.done;
	}
}

export const config = new ConfigStore();

function normalizeStoredModel(row: StoredModel): ConfiguredModel {
	const meta = VENDOR_META[row.vendor];
	const selected = row.selected ?? row.active === true;
	const status = row.status === 'active' ? 'selected' : row.status;
	const defaultDescription = descriptionFor(row.vendor);

	return {
		id: row.id,
		vendor: row.vendor,
		display: row.display || meta.label,
		model: row.model || meta.defaultModel,
		status: selected ? 'selected' : status,
		envVarName: row.envVarName || meta.envVarName,
		systemPrompt: row.systemPrompt,
		description: LEGACY_DESCRIPTIONS.has(row.description) ? defaultDescription : row.description,
		selected,
		userId: row.userId
	};
}

function descriptionFor(vendor: Vendor): string {
	switch (vendor) {
		case 'claude':
			return 'Claude Sonnet from Anthropic.';
		case 'gemini':
			return 'Gemini from Google.';
		case 'gpt':
			return 'GPT from OpenAI.';
		case 'grok':
			return 'Grok from xAI.';
	}
}

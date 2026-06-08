//// # config (store)
//// The roster store. Config is the only writer; chat reads the same singleton.
////
//// Persistence is the IndexedDB `config` store, keyed by each model row's tick stamp. Removing a model
//// clears its selected flag and parks it offline — the row stays.
////
//// ## Imports
import { browser } from '$app/environment';
import { getDb, tick } from './db';
import { defaultRoster, VENDOR_META } from '$lib/vendors/defaults';
import type { ConfiguredModel, ModelStatus, Vendor } from '$lib/types';

//// ## Types

//// ### StoredModel
//// A roster row as it may exist on disk, including legacy fields (`active`, a `'active'` status) that
//// `normalizeStoredModel` migrates forward.
type StoredModel = Omit<ConfiguredModel, 'status'> & {
	active?: boolean;
	status: ModelStatus | 'active';
};

//// ## Internals
//// Legacy auto-generated descriptions, replaced with a clean per-vendor default on load.
const LEGACY_DESCRIPTIONS = new Set([
	'Leads the swarm. Streams the first answer.',
	'Leads the . Streams the first answer.',
	'Selected first. Streams the first answer.',
	'Fast second voice in the roster.',
	'In the roster, waiting for a provider key.'
]);

//// ## ConfigStore

//// ### ConfigStore
//// The roster singleton. Holds the reactive model list and persists every change to IndexedDB.
class ConfigStore {
	//// - `ConfiguredModel[]`: __models__
	////     - *The reactive roster the UI renders.*
	models = $state<ConfiguredModel[]>([]);
	//// - `boolean`: __loaded__
	////     - *True once the initial load (and any seed) has completed.*
	loaded = $state(false);
	//// - `Promise<void> | undefined`: ___loading__
	////     - *In-flight load promise, shared so concurrent callers load once.*
	#loading: Promise<void> | undefined;

	//// ### selected
	//// The selected model, if any.
	get selected(): ConfiguredModel | undefined {
		return this.models.find((model) => model.selected);
	}

	//// ### load
	//// Load the roster, seeding the default providers on first run. Chat and Config both mount at once
	//// and both call this; a single in-flight promise makes them share one load, so the empty store is
	//// never seeded twice.
	load(): Promise<void> {
		if (!browser || this.loaded) return Promise.resolve();
		if (this.#loading === undefined) this.#loading = this.#load();
		return this.#loading;
	}

	//// ### #load
	//// Internal loader. Reads rows (seeding defaults if empty), normalizes legacy rows, sorts by id,
	//// writes the normalized roster back, and marks the store loaded.
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

	//// ### add
	//// Append a new model for `vendor`, seeded from its vendor defaults and persisted.
	async add(vendor: Vendor): Promise<ConfiguredModel> {
		//// **Parameters**
		//// - `Vendor`: __vendor__
		////     - *The model family to add.*
		//// **Returns**
		//// - `Promise<ConfiguredModel>`
		////     - *The created model, also appended to `models`.*
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

	//// ### update
	//// Merge `patch` into the model with `id` and persist the result.
	async update(id: number, patch: Partial<ConfiguredModel>): Promise<void> {
		//// **Parameters**
		//// - `number`: __id__
		////     - *Id of the model to update.*
		//// - `Partial<ConfiguredModel>`: __patch__
		////     - *The fields to merge.*
		const next = this.models.map((model) => (model.id === id ? { ...model, ...patch } : model));
		const updated = next.find((model) => model.id === id);
		if (updated) await this.#put(updated);
		this.models = next;
	}

	//// ### setSelected
	//// Select one model and return the previously selected row to `ready`.
	async setSelected(id: number): Promise<void> {
		//// **Parameters**
		//// - `number`: __id__
		////     - *Id of the model to select.*
		const next = this.models.map<ConfiguredModel>((model) => {
			if (model.id === id) return { ...model, selected: true, status: 'selected' };
			const status: ModelStatus = model.status === 'selected' ? 'ready' : model.status;
			return { ...model, selected: false, status };
		});
		this.models = next;
		await this.#putAll(next);
	}

	//// ### remove
	//// Remove means clear the selected flag and park offline. The row stays.
	async remove(id: number): Promise<void> {
		//// **Parameters**
		//// - `number`: __id__
		////     - *Id of the model to park offline.*
		await this.update(id, { selected: false, status: 'offline' });
	}

	//// ### setStatus
	//// Apply a probe result without touching anything but status. A selected model that probes `ready`
	//// keeps its `selected` status.
	async setStatus(id: number, status: ModelStatus): Promise<void> {
		//// **Parameters**
		//// - `number`: __id__
		////     - *Id of the model whose status changes.*
		//// - `ModelStatus`: __status__
		////     - *The probed status.*
		const model = this.models.find((row) => row.id === id);
		await this.update(id, { status: model?.selected && status === 'ready' ? 'selected' : status });
	}

	//// ### #put
	//// Persist one model to the `config` store (browser only).
	async #put(model: ConfiguredModel): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		await db.put('config', $state.snapshot(model));
	}

	//// ### #putAll
	//// Persist every model in one transaction (browser only).
	async #putAll(models: ConfiguredModel[]): Promise<void> {
		if (!browser) return;
		const db = await getDb();
		const txn = db.transaction('config', 'readwrite');
		for (const model of models) await txn.store.put($state.snapshot(model));
		await txn.done;
	}
}

//// ## Singleton
//// The shared roster instance imported across the app.
export const config = new ConfigStore();

//// ## Functions

//// ### normalizeStoredModel
//// Migrate a possibly-legacy stored row into a current `ConfiguredModel`: fold the old `active` flag
//// and `'active'` status into `selected`, fill blanks from vendor defaults, and replace legacy
//// auto-descriptions.
function normalizeStoredModel(row: StoredModel): ConfiguredModel {
	//// **Parameters**
	//// - `StoredModel`: __row__
	////     - *The row as read from IndexedDB.*
	//// **Returns**
	//// - `ConfiguredModel`
	////     - *The normalized, current-shape row.*
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

//// ### descriptionFor
//// The clean default description for a vendor.
function descriptionFor(vendor: Vendor): string {
	//// **Parameters**
	//// - `Vendor`: __vendor__
	////     - *The model family.*
	//// **Returns**
	//// - `string`
	////     - *A one-line default description for that vendor.*
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

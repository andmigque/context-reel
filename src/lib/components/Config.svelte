<script lang="ts">
	//// # Config.svelte 
	//// 
	//// Roster view. Lists the configured models and lets the user add, edit, probe, select, and
	//// remove them. Provider API keys never reach this component: a row stores only the *name* of
	//// the env var that holds the key; the server reads the value.
	////
	//// ## TODO — code-quality review (deducible at the Sharpdown abstraction level)
	////
	//// TODO (styling/tooling — owner: Architect installs, Claude applies): this file has no class-ordering
	//// convention. Add prettier + prettier-plugin-tailwindcss (VS Code: "Prettier" + "Tailwind CSS
	//// IntelliSense") so utility order is tool-enforced, never hand-typed. Canonical order = layout →
	//// box-model → spacing → sizing → typography → visual → variants (hover:/aria:) last.
	//// TODO (styling — owner: Claude): the inline class="…" strings blow past the ~12–15-utility threshold
	//// and repeat across every field and button. Extract to semantic classes (@apply) or sub-components.
	//// Bonus: that stops the class strings leaking into this doc as false `class` declarations.
	////
	import { onMount } from 'svelte';
	import { config } from '$lib/stores/config.svelte';
	//// TODO (semantic — owner: Architect decides the model, Claude applies): "Vendor" is the wrong domain
	//// word. Claude / Gemini / GPT / Grok are models (families), not vendors; the vendors are Anthropic,
	//// Google, OpenAI, xAI. Split into Provider (Anthropic) → Model (claude-opus-…). One provider owns many
	//// models plus the API base URL, auth scheme, and env-var convention, and routing needs the distinction
	//// ("don't send both fallbacks to one provider"). Touches: type Vendor, VENDOR_ORDER, VENDOR_META,
	//// the --vendor-* colors, and the probe() request body.
	import { VENDOR_ORDER, VENDOR_META } from '$lib/vendors/defaults';
	import type { ConfiguredModel, ModelStatus, Vendor } from '$lib/types';

	//// ## State
	////
	//// - `number`: __editingId__
	////     - *Id of the roster row expanded for editing. `-1` is the sentinel for "no row open"; clicking a row toggles its id against `-1`, so only one row edits at a time.*
	let editingId = $state<number>(-1);
	//// - `Vendor`: __addVendor__
	////     - *Vendor pre-selected in the Add-model dropdown and passed to `config.add()`. Defaults to `'claude'`.*
	let addVendor = $state<Vendor>('claude');
	//// - `number`: __probing__
	////     - *Id of the model whose connection probe is in flight, so its button can read "Probing…" and disable. `-1` means no probe is running.*
	let probing = $state<number>(-1);

	//// ## Lifecycle
	//// Loads the saved roster from local storage into the `config` store when the view mounts.
	onMount(() => {
		void config.load();
	});

	//// ## Functions

	//// TODO (naming — owner: Claude): the signature lies (Lesson 3). This neither sets a class nor touches a
	//// model — it is a pure formatter status -> "pill <status>". Rename to statusBadgeClass(status). It is
	//// also stringly-typed: it hard-codes the scoped CSS names (.pill.ready/.error) with no type linking
	//// ModelStatus to a class that must exist.
	//// ### pillClass
	//// Maps a model status to its scoped CSS class string (`pill ready`, `pill error`, …) for the status badge.
	function pillClass(status: ModelStatus): string {
		//// **Parameters**
		//// - `ModelStatus`: __status__
		////     - *The model's current status.*
		//// **Returns**
		//// - `string`: __className__
		////     - *A `pill <status>` class string that the scoped `.pill` rules style.*
		return `pill ${status}`;
	}

	//// TODO (naming + contract — owner: Claude): rename to addModel(); "add" names no object. The contract
	//// is incoherent: config.add() returns the created model, but this wrapper swallows it into a side
	//// effect (editingId) and reports Promise<void>. Either return the model or make the side effect explicit.
	//// ### add
	//// Creates a model for the selected vendor through the `config` store, then opens the new row for editing.
	async function add(): Promise<void> {
		//// **Returns**
		//// - `Promise<void>`
		////     - *Resolves once the model is created and `editingId` points at it.*
		const model = await config.add(addVendor);
		editingId = model.id;
	}

	//// TODO (naming — owner: Claude): "probe" is network-testing jargon that hides what it checks. The
	//// operation is legitimate (a credential/liveness check against the model endpoint) — only the name is
	//// wrong. Rename to testConnection(model) or verifyCredentials(model). Same Promise<void>-via-store
	//// side-effect shape as add().
	async function probe(model: ConfiguredModel): Promise<void> {
		probing = model.id;
		try {
			const res = await fetch('/api/probe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ vendor: model.vendor, envVarName: model.envVarName })
			});
			const result = (await res.json()) as { status: ModelStatus };
			await config.setStatus(model.id, result.status);
		} catch {
			await config.setStatus(model.id, 'error');
		} finally {
			probing = -1;
		}
	}
</script>

<div class="h-full min-h-0 overflow-y-auto px-[1.4rem] py-[1.2rem]">
	<header class="flex items-center justify-between mb-4">
		<h1 class="m-0 text-[1.1rem] tracking-[0.02em]">Roster</h1>
		<div class="flex gap-[0.4rem]">
			<select bind:value={addVendor} aria-label="Vendor to add">
				{#each VENDOR_ORDER as v (v)}
					<option value={v}>{VENDOR_META[v].label}</option>
				{/each}
			</select>
			<button
				class="bg-green border border-green text-bg-sink rounded-card px-[0.8rem] py-[0.4rem] font-semibold"
				onclick={add}>Add model</button
			>
		</div>
	</header>

	<ul class="list-none m-0 p-0 flex flex-col gap-2 w-full">
		{#each config.models as model (model.id)}
			<li
				class="border border-line rounded-card bg-bg-raise overflow-hidden data-[selected=true]:border-amber"
				data-selected={model.selected}
			>
				<button
					class="w-full flex items-center gap-[0.8rem] px-[0.85rem] py-[0.7rem] bg-transparent border-0 text-left"
					onclick={() => (editingId = editingId === model.id ? -1 : model.id)}
					aria-expanded={editingId === model.id}
				>
					<span
						class="w-8 h-8 rounded-full grid place-items-center text-bg-sink font-bold"
						style="background:{`var(--vendor-${model.vendor})`}"
					>
						{model.display.slice(0, 1)}
					</span>
					<span class="flex flex-col mr-auto">
						<span class="text-bone font-semibold">{model.display}</span>
						<span class="font-mono text-[0.76rem] text-bone-dim">{model.model}</span>
					</span>
					<span class={pillClass(model.status)}>{model.status}</span>
				</button>

				{#if editingId === model.id}
					<div class="grid grid-cols-2 gap-[0.7rem] p-[0.85rem] border-t border-line">
						<label class="flex flex-col gap-[0.25rem] text-[0.76rem] text-bone-dim">
							Display name
							<input value={model.display} oninput={(e) => config.update(model.id, { display: e.currentTarget.value })} />
						</label>
						<label class="flex flex-col gap-[0.25rem] text-[0.76rem] text-bone-dim">
							Vendor
							<select value={model.vendor} onchange={(e) => config.update(model.id, { vendor: e.currentTarget.value as Vendor })}>
								{#each VENDOR_ORDER as v (v)}
									<option value={v}>{VENDOR_META[v].label}</option>
								{/each}
							</select>
						</label>
						<label class="flex flex-col gap-[0.25rem] text-[0.76rem] text-bone-dim">
							Model
							<input value={model.model} oninput={(e) => config.update(model.id, { model: e.currentTarget.value })} />
						</label>
						<label class="flex flex-col gap-[0.25rem] text-[0.76rem] text-bone-dim">
							Env var name <span class="text-amber">(name only — never the key)</span>
							<input value={model.envVarName} oninput={(e) => config.update(model.id, { envVarName: e.currentTarget.value })} />
						</label>
						<label class="col-span-2 flex flex-col gap-[0.25rem] text-[0.76rem] text-bone-dim">
							Description
							<input value={model.description} oninput={(e) => config.update(model.id, { description: e.currentTarget.value })} />
						</label>
						<label class="col-span-2 flex flex-col gap-[0.25rem] text-[0.76rem] text-bone-dim">
							System prompt
							<textarea rows="3" value={model.systemPrompt} oninput={(e) => config.update(model.id, { systemPrompt: e.currentTarget.value })}></textarea>
						</label>

						<div class="col-span-2 flex gap-[0.4rem]">
							<button
								class="bg-bg border border-line rounded-card px-[0.8rem] py-[0.4rem] text-bone text-[0.82rem]"
								onclick={() => probe(model)}
								disabled={probing === model.id}
							>
								{probing === model.id ? 'Probing…' : 'Probe'}
							</button>
							{#if !model.selected}
								<button
									class="bg-bg border border-line rounded-card px-[0.8rem] py-[0.4rem] text-bone text-[0.82rem] hover:border-amber hover:text-amber"
									onclick={() => config.setSelected(model.id)}>Select model</button
								>
							{/if}
							<button
								class="bg-bg border border-line rounded-card px-[0.8rem] py-[0.4rem] text-bone text-[0.82rem] hover:border-red hover:text-red"
								onclick={() => config.remove(model.id)}>Remove</button
							>
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<p class="mt-[1.2rem] text-[0.8rem] text-bone-dim leading-[1.6]">
		A row stores the <strong>name</strong> of an env var, like
		<code class="font-mono text-bone">ANTHROPIC_API_KEY</code>. The key itself lives in the server and
		never reaches this browser.
	</p>
</div>

<style>
	/* Form controls share one look across every input, select, and textarea in
	   this view — a single combined rule beats repeating six utilities per field. */
	select,
	input,
	textarea {
		background: var(--color-bg);
		border: 1px solid var(--color-line);
		border-radius: var(--radius-card);
		color: var(--color-bone);
		padding: 0.4rem 0.55rem;
		font-family: var(--font-sans);
		font-size: 0.88rem;
	}
	textarea {
		resize: vertical;
		font-family: var(--font-mono);
	}

	/* Status pill — the class is computed (`pill ${status}`), so it stays a class
	   set rather than utilities chosen at build time. */
	.pill {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		padding: 0.12rem 0.5rem;
		border-radius: 999px;
		border: 1px solid var(--color-line);
		text-transform: lowercase;
	}
	.pill.ready {
		color: var(--color-green);
		border-color: var(--color-green);
	}
	.pill.selected {
		color: var(--color-bg-sink);
		background: var(--color-amber);
		border-color: var(--color-amber);
	}
	.pill.offline {
		color: var(--color-bone-dim);
	}
	.pill.error {
		color: var(--color-red);
		border-color: var(--color-red);
	}
</style>

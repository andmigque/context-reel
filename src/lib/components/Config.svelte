<script lang="ts">
	import { onMount } from 'svelte';
	import { config } from '$lib/stores/config.svelte';
	import { VENDOR_ORDER, VENDOR_META } from '$lib/vendors/defaults';
	import type { Agent, AgentStatus, Vendor } from '$lib/types';

	let editingId = $state<number>(-1);
	let addVendor = $state<Vendor>('claude');
	let probing = $state<number>(-1);

	onMount(() => {
		void config.load();
	});

	function pillClass(status: AgentStatus): string {
		return `pill ${status}`;
	}

	async function add(): Promise<void> {
		const agent = await config.add(addVendor);
		editingId = agent.id;
	}

	async function probe(agent: Agent): Promise<void> {
		probing = agent.id;
		try {
			const res = await fetch('/api/probe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ vendor: agent.vendor, envVarName: agent.envVarName })
			});
			const result = (await res.json()) as { status: AgentStatus };
			await config.setStatus(agent.id, result.status);
		} catch {
			await config.setStatus(agent.id, 'error');
		} finally {
			probing = -1;
		}
	}
</script>

<div class="config">
	<header class="head">
		<h1>Roster</h1>
		<div class="add">
			<select bind:value={addVendor} aria-label="Vendor to add">
				{#each VENDOR_ORDER as v (v)}
					<option value={v}>{VENDOR_META[v].label}</option>
				{/each}
			</select>
			<button class="primary" onclick={add}>Add agent</button>
		</div>
	</header>

	<ul class="roster">
		{#each config.agents as agent (agent.id)}
			<li class="row" data-active={agent.active}>
				<button
					class="summary"
					onclick={() => (editingId = editingId === agent.id ? -1 : agent.id)}
					aria-expanded={editingId === agent.id}
				>
					<span class="av" style="background:{`var(--vendor-${agent.vendor})`}">
						{agent.display.slice(0, 1)}
					</span>
					<span class="names">
						<span class="display">{agent.display}</span>
						<span class="model">{agent.model}</span>
					</span>
					<span class={pillClass(agent.status)}>{agent.status}</span>
				</button>

				{#if editingId === agent.id}
					<div class="form">
						<label>
							Display name
							<input value={agent.display} oninput={(e) => config.update(agent.id, { display: e.currentTarget.value })} />
						</label>
						<label>
							Vendor
							<select value={agent.vendor} onchange={(e) => config.update(agent.id, { vendor: e.currentTarget.value as Vendor })}>
								{#each VENDOR_ORDER as v (v)}
									<option value={v}>{VENDOR_META[v].label}</option>
								{/each}
							</select>
						</label>
						<label>
							Model
							<input value={agent.model} oninput={(e) => config.update(agent.id, { model: e.currentTarget.value })} />
						</label>
						<label>
							Env var name <span class="boundary">(name only — never the key)</span>
							<input value={agent.envVarName} oninput={(e) => config.update(agent.id, { envVarName: e.currentTarget.value })} />
						</label>
						<label class="wide">
							Description
							<input value={agent.description} oninput={(e) => config.update(agent.id, { description: e.currentTarget.value })} />
						</label>
						<label class="wide">
							System prompt
							<textarea rows="3" value={agent.systemPrompt} oninput={(e) => config.update(agent.id, { systemPrompt: e.currentTarget.value })}></textarea>
						</label>

						<div class="actions">
							<button onclick={() => probe(agent)} disabled={probing === agent.id}>
								{probing === agent.id ? 'Probing…' : 'Probe'}
							</button>
							{#if !agent.active}
								<button class="lead" onclick={() => config.setActive(agent.id)}>Make lead</button>
							{/if}
							<button class="remove" onclick={() => config.remove(agent.id)}>Remove</button>
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<p class="note">
		A row stores the <strong>name</strong> of an env var, like <code>ANTHROPIC_API_KEY</code>. The key
		itself lives in the server and never reaches this browser.
	</p>
</div>

<style>
	.config {
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		padding: 1.2rem 1.4rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}
	.head h1 {
		margin: 0;
		font-size: 1.1rem;
		letter-spacing: 0.02em;
	}
	.add {
		display: flex;
		gap: 0.4rem;
	}
	select,
	input,
	textarea {
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		color: var(--bone);
		padding: 0.4rem 0.55rem;
		font-family: var(--sans);
		font-size: 0.88rem;
	}
	textarea {
		resize: vertical;
		font-family: var(--mono);
	}
	.primary {
		background: var(--green);
		border: 1px solid var(--green);
		color: var(--bg-sink);
		border-radius: var(--radius);
		padding: 0.4rem 0.8rem;
		font-weight: 600;
	}
	.roster {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}
	.row {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--bg-raise);
		overflow: hidden;
	}
	.row[data-active='true'] {
		border-color: var(--amber);
	}
	.summary {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 0.85rem;
		background: transparent;
		border: 0;
		text-align: left;
	}
	.av {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: var(--bg-sink);
		font-weight: 700;
	}
	.names {
		display: flex;
		flex-direction: column;
		margin-right: auto;
	}
	.display {
		color: var(--bone);
		font-weight: 600;
	}
	.model {
		font-family: var(--mono);
		font-size: 0.76rem;
		color: var(--bone-dim);
	}
	.pill {
		font-family: var(--mono);
		font-size: 0.7rem;
		padding: 0.12rem 0.5rem;
		border-radius: 999px;
		border: 1px solid var(--line);
		text-transform: lowercase;
	}
	.pill.ready {
		color: var(--green);
		border-color: var(--green);
	}
	.pill.active {
		color: var(--bg-sink);
		background: var(--amber);
		border-color: var(--amber);
	}
	.pill.offline {
		color: var(--bone-dim);
	}
	.pill.error {
		color: var(--red);
		border-color: var(--red);
	}
	.form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.7rem;
		padding: 0.85rem;
		border-top: 1px solid var(--line);
	}
	.form label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.76rem;
		color: var(--bone-dim);
	}
	.form .wide {
		grid-column: 1 / -1;
	}
	.boundary {
		color: var(--amber);
	}
	.actions {
		grid-column: 1 / -1;
		display: flex;
		gap: 0.4rem;
	}
	.actions button {
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.4rem 0.8rem;
		color: var(--bone);
		font-size: 0.82rem;
	}
	.actions .lead:hover {
		border-color: var(--amber);
		color: var(--amber);
	}
	.actions .remove:hover {
		border-color: var(--red);
		color: var(--red);
	}
	.note {
		margin-top: 1.2rem;
		font-size: 0.8rem;
		color: var(--bone-dim);
		line-height: 1.6;
	}
	.note code {
		font-family: var(--mono);
		color: var(--bone);
	}
</style>

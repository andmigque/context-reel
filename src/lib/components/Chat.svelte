<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { config } from '$lib/stores/config.svelte';
	import { transcript } from '$lib/stores/transcript.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { streamChat, type StreamHandle } from '$lib/chat/stream';
	import { renderMarkdown } from '$lib/markdown';
	import type { ConfiguredModel, Message } from '$lib/types';

	const STILL_WORKING_MS = 10_000;

	let composer = $state('');
	let generating = $state(false);
	let stillWorking = $state(false);

	let handle: StreamHandle | undefined;
	let watchdog: ReturnType<typeof setTimeout> | undefined;
	let activeAssistantId = -1;
	let sendStart = 0;

	let threadEl!: HTMLDivElement;
	let atBottom = true;

	// Models that can answer: ready or selected first.
	const selectable = $derived(
		[...config.models]
			.filter((model) => model.status === 'ready' || model.status === 'selected')
			.sort((a, b) => Number(b.selected) - Number(a.selected))
	);
	const selected = $derived<ConfiguredModel | undefined>(
		config.selected ?? selectable[0]
	);

	const lastAssistant = $derived<Message | undefined>(
		[...transcript.messages].reverse().find((m) => m.role === 'assistant')
	);

	// A draft zapped in from the editor pre-fills the composer.
	$effect(() => {
		const pending = workspace.pendingZap;
		if (pending.length === 0) return;
		workspace.consumeZap();
		composer = pending;
	});

	function clearWatchdog(): void {
		if (watchdog !== undefined) {
			clearTimeout(watchdog);
			watchdog = undefined;
		}
	}

	function armWatchdog(): void {
		clearWatchdog();
		watchdog = setTimeout(() => {
			stillWorking = true;
		}, STILL_WORKING_MS);
	}

	async function maybeScroll(): Promise<void> {
		if (!atBottom) return; // reader scrolled up: do not yank the viewport down
		await tick();
		threadEl?.scrollTo({ top: threadEl.scrollHeight });
	}

	function onThreadScroll(): void {
		if (!threadEl) return;
		const slack = threadEl.scrollHeight - threadEl.scrollTop - threadEl.clientHeight;
		atBottom = slack < 60;
	}

	function send(): void {
		const text = composer.trim();
		if (text.length === 0 || generating) return;
		const model = selected;
		if (!model) return;

		// 1. Instant: the user turn and the generating state land before any server reply.
		transcript.append('user', text, '', 'complete');
		composer = '';
		atBottom = true;

		const assistant = transcript.append('assistant', '', model.vendor, 'streaming');
		activeAssistantId = assistant.id;
		generating = true;
		stillWorking = false;
		sendStart = performance.now();
		armWatchdog();
		void maybeScroll();

		// 2. Open the stream with the whole transcript. The server keeps nothing.
		handle = streamChat(
			{
				vendor: model.vendor,
				model: model.model,
				envVarName: model.envVarName,
				systemPrompt: model.systemPrompt,
				turns: transcript.toTurns()
			},
			{
				onToken: (value) => {
					const msg = transcript.messages.find((m) => m.id === activeAssistantId);
					if (!msg) return;
					const isFirst = msg.tokenCount === 0;
					transcript.patch(activeAssistantId, {
						text: msg.text + value,
						tokenCount: msg.tokenCount + 1,
						ttftMs: isFirst ? Math.round(performance.now() - sendStart) : msg.ttftMs
					});
					stillWorking = false;
					armWatchdog();
					void maybeScroll();
				},
				onDone: () => {
					clearWatchdog();
					transcript.patch(activeAssistantId, { state: 'complete' });
					generating = false;
					stillWorking = false;
					void maybeScroll();
				},
				onError: (message) => {
					clearWatchdog();
					const msg = transcript.messages.find((m) => m.id === activeAssistantId);
					const suffix = msg && msg.text.length > 0 ? '\n\n' : '';
					transcript.patch(activeAssistantId, {
						state: 'error',
						text: (msg?.text ?? '') + `${suffix}_error: ${message}_`
					});
					generating = false;
					stillWorking = false;
				}
			}
		);
	}

	function stop(): void {
		handle?.abort();
		clearWatchdog();
		transcript.patch(activeAssistantId, { state: 'stopped' });
		generating = false;
		stillWorking = false;
	}

	// Resend the last user turn — used by Retry and Reroute.
	async function resend(modelId?: number): Promise<void> {
		if (generating) return;
		if (modelId !== undefined) await config.setSelected(modelId);
		const lastUser = [...transcript.messages].reverse().find((m) => m.role === 'user');
		if (!lastUser) return;
		composer = lastUser.text;
		send();
	}

	function onComposerKey(event: KeyboardEvent): void {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			send();
		}
		// Shift+Enter falls through to insert a newline.
	}

	// Alt+Shift+<digit> picks the selected model from the roster.
	function onVendorChord(event: KeyboardEvent): void {
		if (workspace.view !== 'chat') return;
		if (!event.altKey || !event.shiftKey) return;
		const match = /^Digit([1-9])$/.exec(event.code);
		if (!match) return;
		const index = Number(match[1]) - 1;
		const model = selectable[index];
		if (!model) return;
		event.preventDefault();
		void config.setSelected(model.id);
	}

	onMount(() => {
		void config.load();
		void transcript.load();
		window.addEventListener('keydown', onVendorChord);
	});

	onDestroy(() => {
		clearWatchdog();
		if (typeof window !== 'undefined') window.removeEventListener('keydown', onVendorChord);
	});
</script>

<div class="chat">
	<div class="roster" role="tablist" aria-label="Selected model">
		{#each selectable as model, i (model.id)}
			<button
				class="chip"
				role="tab"
				aria-selected={selected?.id === model.id}
				style="--vc:{`var(--vendor-${model.vendor})`}"
				title={`Alt+Shift+${i + 1}`}
				onclick={() => config.setSelected(model.id)}
			>
				<span class="av" style="background:{`var(--vendor-${model.vendor})`}"></span>
				{model.display}
			</button>
		{/each}
		{#if selectable.length === 0}
			<span class="empty">No ready models. Add one in config (Alt+Shift+K).</span>
		{/if}
	</div>

	<div class="thread" bind:this={threadEl} onscroll={onThreadScroll}>
		{#each transcript.messages as msg (msg.id)}
			<div class="turn {msg.role}" data-state={msg.state}>
				<div class="meta">
					<span class="who">{msg.role === 'user' ? 'you' : msg.vendor || 'assistant'}</span>
					{#if msg.role === 'assistant' && msg.ttftMs > 0}
						<span class="stat">ttft {msg.ttftMs}ms · {msg.tokenCount} tok</span>
					{/if}
					{#if msg.state === 'stopped'}<span class="badge stop">stopped</span>{/if}
					{#if msg.state === 'error'}<span class="badge err">error</span>{/if}
				</div>

				{#if msg.role === 'assistant'}
					<div class="bubble md">
						<!-- progressive markdown: rendered live as tokens land -->
						{@html renderMarkdown(msg.text)}{#if msg.state === 'streaming'}<span
								class="caret"
								aria-hidden="true"></span>{/if}
					</div>
					{#if msg.state === 'streaming' && stillWorking}
						<div class="working">still working… no token for {STILL_WORKING_MS / 1000}s</div>
					{/if}
					{#if msg.state === 'error'}
						<div class="recovery">
							<button onclick={() => void resend()}>Retry</button>
							{#each selectable.filter((model) => model.id !== selected?.id) as alt (alt.id)}
								<button class="reroute" onclick={() => void resend(alt.id)}>Reroute → {alt.display}</button>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="bubble user-text">{msg.text}</div>
				{/if}
			</div>
		{/each}

		{#if transcript.messages.length === 0}
			<div class="hello">
				<p>Ask a question and watch the answer form, token by token.</p>
				<p class="dim">No blank pause. Ever.</p>
			</div>
		{/if}
	</div>

	<form
		class="composer"
		onsubmit={(e) => {
			e.preventDefault();
			send();
		}}
	>
		<textarea
			class="input"
			placeholder="Message the selected model (Enter sends, Shift+Enter adds a line)"
			bind:value={composer}
			onkeydown={onComposerKey}
			rows="2"
		></textarea>
		{#if generating}
			<button type="button" class="send stop" onclick={stop}>Stop</button>
		{:else}
			<button type="submit" class="send" disabled={composer.trim().length === 0}>Send</button>
		{/if}
	</form>
</div>

<style>
	.chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
	.roster {
		display: flex;
		gap: 0.4rem;
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--line);
		background: var(--bg-sink);
		flex-wrap: wrap;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
		color: var(--bone-dim);
		font-size: 0.82rem;
	}
	.chip[aria-selected='true'] {
		color: var(--bone);
		border-color: var(--vc);
	}
	.av {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
	}
	.empty {
		font-size: 0.82rem;
		color: var(--bone-dim);
	}
	.thread {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.turn {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-width: 52rem;
	}
	.turn.user {
		align-self: flex-end;
		align-items: flex-end;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: var(--bone-dim);
	}
	.who {
		font-family: var(--mono);
		text-transform: lowercase;
	}
	.stat {
		font-family: var(--mono);
		color: var(--green);
	}
	.badge {
		font-family: var(--mono);
		font-size: 0.66rem;
		padding: 0.05rem 0.4rem;
		border-radius: 4px;
	}
	.badge.stop {
		color: var(--amber);
		border: 1px solid var(--amber);
	}
	.badge.err {
		color: var(--red);
		border: 1px solid var(--red);
	}
	.bubble {
		border-radius: var(--radius);
		padding: 0.7rem 0.95rem;
		border: 1px solid var(--line);
	}
	.turn.assistant .bubble {
		background: var(--bg-raise);
	}
	.turn.user .bubble {
		background: color-mix(in srgb, var(--green) 14%, var(--bg-raise));
		border-color: color-mix(in srgb, var(--green) 30%, var(--line));
	}
	.user-text {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.turn[data-state='error'] .bubble {
		border-color: var(--red);
	}
	.caret {
		display: inline-block;
		width: 0.55em;
		height: 1.05em;
		margin-left: 1px;
		vertical-align: text-bottom;
		background: var(--green);
		animation: blink 1s steps(2, start) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.working {
		font-size: 0.78rem;
		color: var(--amber);
		font-style: italic;
	}
	.recovery {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.recovery button {
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.3rem 0.7rem;
		color: var(--bone);
		font-size: 0.8rem;
	}
	.recovery button:hover {
		border-color: var(--green);
		color: var(--green);
	}
	.recovery .reroute:hover {
		border-color: var(--amber);
		color: var(--amber);
	}
	.hello {
		margin: auto;
		text-align: center;
		color: var(--bone);
	}
	.hello .dim {
		color: var(--bone-dim);
		font-family: var(--mono);
	}
	.composer {
		display: flex;
		gap: 0.6rem;
		padding: 0.7rem 0.8rem;
		border-top: 1px solid var(--line);
		background: var(--bg-sink);
	}
	.input {
		flex: 1;
		resize: none;
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.6rem 0.75rem;
		color: var(--bone);
		font-family: var(--sans);
		font-size: 0.92rem;
		line-height: 1.45;
	}
	.input:focus {
		outline: 0;
		border-color: var(--green);
	}
	.send {
		align-self: stretch;
		min-width: 5.5rem;
		border: 1px solid var(--green);
		background: var(--green);
		color: var(--bg-sink);
		border-radius: var(--radius);
		font-weight: 600;
	}
	.send:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.send.stop {
		background: var(--red);
		border-color: var(--red);
		color: #fff;
	}
</style>

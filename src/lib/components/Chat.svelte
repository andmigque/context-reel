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

<div class="flex flex-col h-full min-h-0">
	<div
		class="flex flex-wrap gap-[0.4rem] px-[0.8rem] py-[0.6rem] border-b border-line bg-bg-sink"
		role="tablist"
		aria-label="Selected model"
	>
		{#each selectable as model, i (model.id)}
			<button
				class="flex items-center gap-[0.4rem] bg-bg-raise border border-line rounded-full px-[0.7rem] py-[0.25rem] text-bone-dim text-[0.82rem] aria-selected:text-bone aria-selected:[border-color:var(--vc)]"
				role="tab"
				aria-selected={selected?.id === model.id}
				style="--vc:{`var(--vendor-${model.vendor})`}"
				title={`Alt+Shift+${i + 1}`}
				onclick={() => config.setSelected(model.id)}
			>
				<span class="w-[0.6rem] h-[0.6rem] rounded-full" style="background:{`var(--vendor-${model.vendor})`}"></span>
				{model.display}
			</button>
		{/each}
		{#if selectable.length === 0}
			<span class="text-[0.82rem] text-bone-dim">No ready models. Add one in config (Alt+Shift+K).</span>
		{/if}
	</div>

	<div
		class="flex-1 min-h-0 overflow-y-auto px-[1.2rem] py-4 flex flex-col gap-4"
		bind:this={threadEl}
		onscroll={onThreadScroll}
	>
		{#each transcript.messages as msg (msg.id)}
			<div
				class="flex flex-col gap-[0.35rem] max-w-[52rem] {msg.role === 'user'
					? 'self-end items-end'
					: ''}"
			>
				<div class="flex items-center gap-2 text-[0.72rem] text-bone-dim">
					<span class="font-mono lowercase">{msg.role === 'user' ? 'you' : msg.vendor || 'assistant'}</span>
					{#if msg.role === 'assistant' && msg.ttftMs > 0}
						<span class="font-mono text-green">ttft {msg.ttftMs}ms · {msg.tokenCount} tok</span>
					{/if}
					{#if msg.state === 'stopped'}<span
							class="font-mono text-[0.66rem] px-[0.4rem] py-[0.05rem] rounded-[4px] text-amber border border-amber"
							>stopped</span
						>{/if}
					{#if msg.state === 'error'}<span
							class="font-mono text-[0.66rem] px-[0.4rem] py-[0.05rem] rounded-[4px] text-red border border-red"
							>error</span
						>{/if}
				</div>

				{#if msg.role === 'assistant'}
					<div
						class="md rounded-card px-[0.95rem] py-[0.7rem] border bg-bg-raise {msg.state === 'error'
							? 'border-red'
							: 'border-line'}"
					>
						<!-- progressive markdown: rendered live as tokens land -->
						{@html renderMarkdown(msg.text)}{#if msg.state === 'streaming'}<span
								class="caret"
								aria-hidden="true"></span>{/if}
					</div>
					{#if msg.state === 'streaming' && stillWorking}
						<div class="text-[0.78rem] text-amber italic">
							still working… no token for {STILL_WORKING_MS / 1000}s
						</div>
					{/if}
					{#if msg.state === 'error'}
						<div class="flex flex-wrap gap-[0.4rem]">
							<button
								class="bg-bg-raise border border-line rounded-card px-[0.7rem] py-[0.3rem] text-bone text-[0.8rem] hover:border-green hover:text-green"
								onclick={() => void resend()}>Retry</button
							>
							{#each selectable.filter((model) => model.id !== selected?.id) as alt (alt.id)}
								<button
									class="bg-bg-raise border border-line rounded-card px-[0.7rem] py-[0.3rem] text-bone text-[0.8rem] hover:border-amber hover:text-amber"
									onclick={() => void resend(alt.id)}>Reroute → {alt.display}</button
								>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="user-bubble rounded-card px-[0.95rem] py-[0.7rem] border whitespace-pre-wrap break-words">{msg.text}</div>
				{/if}
			</div>
		{/each}

		{#if transcript.messages.length === 0}
			<div class="m-auto text-center text-bone">
				<p>Type a message to start. Every model shares this one history.</p>
			</div>
		{/if}
	</div>

	<form
		class="flex gap-[0.6rem] px-[0.8rem] py-[0.7rem] border-t border-line bg-bg-sink"
		onsubmit={(e) => {
			e.preventDefault();
			send();
		}}
	>
		<textarea
			class="flex-1 resize-none bg-bg border border-line rounded-card px-[0.75rem] py-[0.6rem] text-bone font-sans text-[0.92rem] leading-[1.45] focus:outline-none focus:border-green"
			placeholder="Message the selected model (Enter sends, Shift+Enter adds a line)"
			bind:value={composer}
			onkeydown={onComposerKey}
			rows="4"
		></textarea>
		<!-- The buttons held their height by stretching to the textarea, so doubling
		     the composer doubled them too. h-16 pins them at the height they had at
		     two rows, and self-end keeps them level with the bottom of the input. -->
		{#if generating}
			<button
				type="button"
				class="self-end h-16 min-w-[5.5rem] border border-red bg-red text-white rounded-card font-semibold"
				onclick={stop}>Stop</button
			>
		{:else}
			<button
				type="submit"
				class="self-end h-16 min-w-[5.5rem] border border-green bg-green text-bg-sink rounded-card font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
				disabled={composer.trim().length === 0}>Send</button
			>
		{/if}
	</form>
</div>

<style>
	/* Streaming caret — a blinking keyframe is clearest expressed as a CSS rule. */
	.caret {
		display: inline-block;
		width: 0.55em;
		height: 1.05em;
		margin-left: 1px;
		vertical-align: text-bottom;
		background: var(--color-green);
		animation: blink 1s steps(2, start) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	/* User bubble tint blends green into the raised surface; color-mix reads
	   clearer here than an arbitrary utility. The `border` utility sets the width;
	   this rule supplies the blended color. */
	.user-bubble {
		background: color-mix(in srgb, var(--color-green) 14%, var(--color-bg-raise));
		border-color: color-mix(in srgb, var(--color-green) 30%, var(--color-line));
	}
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { renderMarkdown } from '$lib/markdown';

	// The doc lives in local storage today (the spec's named "today" home);
	// IndexedDB is the stated target for a later pass.
	const STORAGE_KEY = 'cadence:editor:doc';

	let textarea!: HTMLTextAreaElement;
	let previewing = $state(false);
	let previewHtml = $state('');
	let mounted = false;

	// ── The seam ────────────────────────────────────────────────────────────
	// Reading the doc is reading the value; writing the doc is writing the value.
	// A write fires a synthetic input event so the library repaints.
	function readDoc(): string {
		return textarea ? textarea.value : '';
	}

	function writeDoc(text: string): void {
		if (!textarea) return;
		textarea.value = text;
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
	}

	function persist(): void {
		try {
			localStorage.setItem(STORAGE_KEY, readDoc());
		} catch {
			// storage unavailable; the working copy still lives in the value
		}
	}

	function refreshPreview(): void {
		if (previewing) previewHtml = renderMarkdown(readDoc());
	}

	function onInput(): void {
		persist();
		refreshPreview();
	}

	function togglePreview(): void {
		previewing = !previewing;
		refreshPreview();
	}

	// ── Out-zap: selection, else whole doc, then navigate to the chat ─────────
	function zapToChat(): void {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selection = readDoc().slice(start, end);
		const payload = selection.length > 0 ? selection : readDoc();
		workspace.zapToChat(payload);
	}

	// ── In-zap: a doc picked in the rail replaces the content ─────────────────
	function onToEditor(event: Event): void {
		if (!mounted) return; // a zap before mount is ignored without error
		const text = (event as CustomEvent<string>).detail ?? '';
		writeDoc(text);
		persist();
		refreshPreview();
	}

	function onCommand(event: Event): void {
		if (!mounted) return;
		const command = (event as CustomEvent<string>).detail;
		if (command === 'editor.zapToChat') zapToChat();
		else if (command === 'editor.togglePreview') togglePreview();
	}

	onMount(async () => {
		// Restore the persisted doc into the value before the library enhances it.
		let saved = '';
		try {
			saved = localStorage.getItem(STORAGE_KEY) ?? '';
		} catch {
			saved = '';
		}
		if (saved.length > 0) textarea.value = saved;

		// Enhance the native textarea in place (browser-only import).
		const mod = await import('markdown-text-editor');
		const MarkdownEditor = mod.default;
		new MarkdownEditor('#cadence-editor', { mode: 'hybrid' });

		// Repaint to reflect the restored value, then go live.
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		mounted = true;

		window.addEventListener('cadence:to-editor', onToEditor);
		window.addEventListener('cadence:command', onCommand);
	});

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		window.removeEventListener('cadence:to-editor', onToEditor);
		window.removeEventListener('cadence:command', onCommand);
	});
</script>

<div class="editor" data-previewing={previewing}>
	<div class="bar">
		<span class="mode">{previewing ? 'preview' : 'edit'}</span>
		<button class="toggle" title="Alt+Shift+R" onclick={togglePreview}>
			{previewing ? 'Edit' : 'Preview'}
		</button>
		<button class="zap" title="Alt+Shift+Z" onclick={zapToChat}>Zap to chat →</button>
	</div>

	<div class="surface">
		<!-- The host textarea. Its value is the document. -->
		<textarea
			id="cadence-editor"
			class="host"
			bind:this={textarea}
			hidden={previewing}
			oninput={onInput}
			placeholder="# Write here&#10;&#10;The text is the truth."
		></textarea>

		{#if previewing}
			<div class="preview md" aria-label="Rendered preview">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html previewHtml}
			</div>
		{/if}
	</div>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--line);
		background: var(--bg-sink);
	}
	.mode {
		font-family: var(--mono);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--bone-dim);
		margin-right: auto;
	}
	.toggle,
	.zap {
		background: var(--bg-raise);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 0.3rem 0.7rem;
		color: var(--bone);
		font-size: 0.82rem;
	}
	.toggle:hover {
		border-color: var(--amber);
		color: var(--amber);
	}
	.zap:hover {
		border-color: var(--green);
		color: var(--green);
	}
	.surface {
		flex: 1;
		min-height: 0;
		display: flex;
	}
	.host {
		flex: 1;
		width: 100%;
		min-height: 0;
		resize: none;
		border: 0;
		outline: 0;
		padding: 1rem;
		background: var(--bg);
		color: var(--bone);
		font-family: var(--mono);
		font-size: 0.95rem;
		line-height: 1.6;
	}
	.preview {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 1rem 1.4rem;
	}

	/* The library injects this wrapper. Make it fill the panel both ways and,
	   crucially, cap it to the column so its internal preview split can never
	   push past one fraction. Height is fluid — never a frozen px. */
	:global(.editor .markdown-editor-wrapper) {
		flex: 1 1 0;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		height: 100% !important;
	}
	/* Hide the library's own preview toggle and its split pane. ContextReel owns the
	   preview (Alt+Shift+R / the Preview button), and the library's two-column
	   split has no min-width:0, so it overflows the column and breaks the page. */
	:global(.editor .markdown-editor-wrapper button[title='Preview']) {
		display: none !important;
	}
	:global(.editor .markdown-editor-wrapper .preview-wrapper) {
		display: none !important;
	}
	:global(.editor .markdown-editor-wrapper .editor-layout) {
		grid-template-columns: minmax(0, 1fr) !important;
		min-width: 0;
	}
	/* While ContextReel's preview is on, take the library wrapper out of the flow so
	   the preview owns the full width instead of splitting it. */
	:global(.editor[data-previewing='true'] .markdown-editor-wrapper) {
		display: none !important;
	}
</style>

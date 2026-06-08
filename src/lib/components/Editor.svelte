<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { renderMarkdown } from '$lib/markdown';

	const STORAGE_KEY = 'context-reel:editor:doc';

	let textarea!: HTMLTextAreaElement;
	let previewing = $state(false);
	let previewHtml = $state('');
	let mounted = false;

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

	function zapToChat(): void {
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selection = readDoc().slice(start, end);
		const payload = selection.length > 0 ? selection : readDoc();
		workspace.zapToChat(payload);
	}

	function onToEditor(event: Event): void {
		if (!mounted) return;
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

		let saved = '';
		
		try {
			saved = localStorage.getItem(STORAGE_KEY) ?? '';
		} catch {
			saved = '';
		}
		if (saved.length > 0) textarea.value = saved;

		const mod = await import('markdown-text-editor');
		const MarkdownEditor = mod.default;
		new MarkdownEditor('#context-reel-editor', { mode: 'hybrid' });

		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		mounted = true;

		window.addEventListener('context-reel:to-editor', onToEditor);
		window.addEventListener('context-reel:command', onCommand);
	});

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		window.removeEventListener('context-reel:to-editor', onToEditor);
		window.removeEventListener('context-reel:command', onCommand);
	});
</script>

<div class="editor flex flex-col h-full min-h-0" data-previewing={previewing}>
	<div class="flex items-center gap-2 px-3 py-2 border-b border-line bg-bg-sink">
		<span class="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-bone-dim mr-auto"
			>{previewing ? 'preview' : 'edit'}</span
		>
		<button
			class="bg-bg-raise border border-line rounded-card px-[0.7rem] py-[0.3rem] text-bone text-[0.82rem] hover:border-amber hover:text-amber"
			title="Alt+Shift+R"
			onclick={togglePreview}
		>
			{previewing ? 'Edit' : 'Preview'}
		</button>
		<button
			class="bg-bg-raise border border-line rounded-card px-[0.7rem] py-[0.3rem] text-bone text-[0.82rem] hover:border-green hover:text-green"
			title="Alt+Shift+Z"
			onclick={zapToChat}>Zap to chat →</button
		>
	</div>

	<div class="flex-1 min-h-0 flex">
		<!-- The host textarea. Its value is the document. -->
		<textarea
			id="context-reel-editor"
			class="flex-1 w-full min-h-0 resize-none border-0 outline-none p-4 bg-bg text-bone font-mono text-[0.95rem] leading-[1.6]"
			bind:this={textarea}
			hidden={previewing}
			oninput={onInput}
			placeholder="# Write here&#10;&#10;The text is the truth."
		></textarea>

		{#if previewing}
			<div class="md flex-1 min-h-0 overflow-y-auto px-[1.4rem] py-4" aria-label="Rendered preview">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html previewHtml}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.editor .markdown-editor-wrapper) {
		flex: 1 1 0;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		height: 100% !important;
	}
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
	:global(.editor[data-previewing='true'] .markdown-editor-wrapper) {
		display: none !important;
	}
	:global(#context-reel-editor) {
		caret-color: var(--amber) !important;
	}
</style>

// The library ships no types; declare the slice we use.
declare module 'markdown-text-editor' {
	export interface MarkdownEditorOptions {
		mode?: 'plain' | 'hybrid';
	}
	export default class MarkdownEditor {
		constructor(selector: string, options?: MarkdownEditorOptions);
	}
}

// The library ships no types; declare the slice we use.
declare module 'markdown-text-editor' {
	export interface MarkdownEditorOptions {
		mode?: 'plain' | 'hybrid';
		// Read straight from options, falling back to the nearest [data-theme]
		// ancestor. These four are the themes the bundled stylesheet defines.
		theme?: 'light' | 'dark' | 'snowberry' | 'darkberry';
	}
	export default class MarkdownEditor {
		constructor(selector: string, options?: MarkdownEditorOptions);
	}
}

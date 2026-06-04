import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/**
 * Render markdown to HTML for the chat bubble and the editor preview.
 *
 * Note: output is injected via {@html}. Content is the user's own text and the
 * model's reply in a single-user local workspace, so we do not sanitise here.
 * If Cadence ever renders untrusted third-party content, pipe this through a
 * sanitiser before display.
 */
export function renderMarkdown(text: string): string {
	return marked.parse(text, { async: false });
}

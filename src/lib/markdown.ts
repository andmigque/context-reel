import { marked, Renderer, type Tokens } from 'marked';

const renderer = new Renderer();

marked.setOptions({ gfm: true, breaks: true });

renderer.html = ({ text }: Tokens.HTML | Tokens.Tag): string => escapeHtml(text);

renderer.link = function ({ href, title, tokens }: Tokens.Link): string {
	const label = this.parser.parseInline(tokens);
	if (!isSafeUrl(href)) return label;
	const titleAttr = title ? ` title="${escapeAttribute(title)}"` : '';
	return `<a href="${escapeAttribute(href)}"${titleAttr} rel="noopener noreferrer">${label}</a>`;
};

renderer.image = ({ href, title, text }: Tokens.Image): string => {
	if (!isSafeUrl(href)) return escapeHtml(text);
	const titleAttr = title ? ` title="${escapeAttribute(title)}"` : '';
	return `<img src="${escapeAttribute(href)}" alt="${escapeAttribute(text)}"${titleAttr}>`;
};

marked.use({ renderer });

/**
 * Render markdown for chat bubbles and editor preview.
 *
 * Output is injected through Svelte {@html}, so raw HTML and unsafe URL schemes
 * are neutralized before display.
 */
export function renderMarkdown(text: string): string {
	return marked.parse(text, { async: false });
}

function isSafeUrl(value: string): boolean {
	const normalized = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, '');
	const schemeEnd = normalized.indexOf(':');
	if (schemeEnd === -1) return true;

	const scheme = normalized.slice(0, schemeEnd).toLowerCase();
	return scheme === 'http' || scheme === 'https' || scheme === 'mailto';
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function escapeAttribute(value: string): string {
	return escapeHtml(value).replaceAll('`', '&#96;');
}

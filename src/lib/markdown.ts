//// # markdown
//// Render markdown for chat bubbles and editor preview. Output is injected through Svelte {@html}, so
//// raw HTML and unsafe URL schemes are neutralized before display.
////
//// ## Imports
import { marked, Renderer, type Tokens } from 'marked';

//// ## Internals
//// A `marked` renderer hardened against injection: raw HTML is escaped, and links and images render
//// only when their URL scheme is safe.
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

//// ## Functions

//// ### renderMarkdown
//// Render markdown for chat bubbles and editor preview. Output is injected through Svelte {@html}, so
//// raw HTML and unsafe URL schemes are neutralized before display.
export function renderMarkdown(text: string): string {
	//// **Parameters**
	//// - `string`: __text__
	////     - *The markdown source.*
	//// **Returns**
	//// - `string`
	////     - *Sanitized HTML safe to inject.*
	return marked.parse(text, { async: false });
}

//// ### isSafeUrl
//// True when a URL has no scheme or an http/https/mailto scheme; control characters and whitespace are
//// stripped before the check.
function isSafeUrl(value: string): boolean {
	//// **Parameters**
	//// - `string`: __value__
	////     - *The URL to test.*
	//// **Returns**
	//// - `boolean`
	////     - *Whether the URL is safe to render.*
	const normalized = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, '');
	const schemeEnd = normalized.indexOf(':');
	if (schemeEnd === -1) return true;

	const scheme = normalized.slice(0, schemeEnd).toLowerCase();
	return scheme === 'http' || scheme === 'https' || scheme === 'mailto';
}

//// ### escapeHtml
//// Escape the five HTML-significant characters.
function escapeHtml(value: string): string {
	//// **Parameters**
	//// - `string`: __value__
	////     - *The text to escape.*
	//// **Returns**
	//// - `string`
	////     - *The escaped text.*
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

//// ### escapeAttribute
//// Escape as `escapeHtml`, plus backticks, for use inside an attribute value.
function escapeAttribute(value: string): string {
	//// **Parameters**
	//// - `string`: __value__
	////     - *The attribute value to escape.*
	//// **Returns**
	//// - `string`
	////     - *The escaped attribute value.*
	return escapeHtml(value).replaceAll('`', '&#96;');
}

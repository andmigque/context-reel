import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

// renderMarkdown output is injected through Svelte {@html}, so these tests are a
// security boundary: any unsafe scheme or raw HTML that survives is an XSS hole.
describe('renderMarkdown — safe links', () => {
	it('renders an http(s) link with a hardened rel', () => {
		const html = renderMarkdown('[site](https://example.com)');
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it('renders a mailto link', () => {
		expect(renderMarkdown('[mail](mailto:a@b.com)')).toContain('href="mailto:a@b.com"');
	});

	it('renders a scheme-less relative link', () => {
		expect(renderMarkdown('[rel](/docs/intro)')).toContain('href="/docs/intro"');
	});
});

describe('renderMarkdown — unsafe schemes are neutralized', () => {
	it('drops a javascript: link but keeps the visible label', () => {
		const html = renderMarkdown('[click](javascript:alert(1))');
		expect(html).not.toContain('href');
		expect(html).not.toContain('javascript:');
		expect(html).toContain('click');
	});

	it('is case-insensitive about the scheme', () => {
		expect(renderMarkdown('[x](JavaScript:alert(1))')).not.toContain('href');
	});

	it('drops vbscript: and data: links', () => {
		expect(renderMarkdown('[x](vbscript:msgbox(1))')).not.toContain('href');
		expect(renderMarkdown('[x](data:text/html,<script>alert(1)</script>)')).not.toContain('href');
	});

	it('neutralizes an unsafe image into its alt text, never an <img>', () => {
		const html = renderMarkdown('![boom](javascript:alert(1))');
		expect(html).not.toContain('<img');
		expect(html).toContain('boom');
	});
});

describe('renderMarkdown — raw HTML is escaped', () => {
	it('escapes an injected <script> tag instead of emitting it', () => {
		const html = renderMarkdown('hello <script>alert(1)</script>');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('escapes an inline event-handler tag', () => {
		const html = renderMarkdown('<img src=x onerror=alert(1)>');
		expect(html).not.toContain('onerror=alert(1)>');
		expect(html).toContain('&lt;img');
	});
});

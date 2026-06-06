import { test, expect, type Workspace } from './support/workspace';
import type { Page } from '@playwright/test';

const MAP = 'svg[aria-label="Document mind map"]';
const NODE = `${MAP} g.markmap-node`;

/** Show the map via its chord and wait for the tree to paint. */
async function showMap(page: Page, workspace: Workspace): Promise<void> {
	await page.keyboard.press('Alt+Shift+M');
	await expect(workspace.tab('MarkMap')).toHaveAttribute('aria-selected', 'true');
	await page.locator(NODE).first().waitFor({ state: 'visible' });
}

/**
 * MarkMap spec. The map renders what is in the editor: it tracks the zap
 * channel, survives a view swap, and shows a placeholder when the document is
 * empty.
 */
test.describe('MarkMap', () => {
	test('the map renders the document', async ({ page, workspace }) => {
		await workspace.setEditorDoc('# Top Heading\n\n- one\n- two');
		await showMap(page, workspace);
		// a node for the top heading
		await expect(page.locator(MAP).getByText('Top Heading')).toBeVisible();
		// the tree is fit within the panel: the rendered content sits inside the
		// SVG box and nothing overflows the page
		const fit = await page.evaluate((sel) => {
			const svg = document.querySelector(sel) as SVGSVGElement;
			const content = svg.querySelector('g') as SVGGElement; // markmap's viewport group
			const s = svg.getBoundingClientRect();
			const c = content.getBoundingClientRect();
			return {
				fitsWidth: c.left >= s.left - 1 && c.right <= s.right + 1,
				fitsHeight: c.top >= s.top - 1 && c.bottom <= s.bottom + 1,
				overflow: document.body.scrollWidth > document.body.clientWidth
			};
		}, MAP);
		expect(fit.fitsWidth).toBe(true);
		expect(fit.fitsHeight).toBe(true);
		expect(fit.overflow).toBe(false);
	});

	test('the map tracks the writing', async ({ page, workspace }) => {
		await workspace.setEditorDoc('# First Doc');
		await showMap(page, workspace);
		await expect(page.locator(MAP).getByText('First Doc')).toBeVisible();
		// a new document arrives on the editor's zap channel
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent('context-reel:to-editor', { detail: '# Second Doc' }));
		});
		// the map re-renders from it
		await expect(page.locator(MAP).getByText('Second Doc')).toBeVisible();
		await expect(page.locator(MAP).getByText('First Doc')).toHaveCount(0);
	});

	test('the map survives a view swap', async ({ page, workspace }) => {
		await workspace.setEditorDoc('# Durable Map');
		await showMap(page, workspace);
		await page.evaluate(() => ((window as unknown as { __alive: boolean }).__alive = true));
		await workspace.show('Chat');
		await page.keyboard.press('Alt+Shift+M'); // swap back via the chord
		await expect(page.locator(MAP).getByText('Durable Map')).toBeVisible();
		const alive = await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive);
		expect(alive).toBe(true); // no reload wiped the page
	});

	test('the empty state still shows a map', async ({ page, workspace }) => {
		// The clean boot cleared local storage, so the editor document is empty.
		await showMap(page, workspace);
		// the placeholder document renders ("Write in the editor" is unique to it)
		await expect(page.locator(MAP).getByText('Write in the editor')).toBeVisible();
	});

	test('the first show fits the panel with no NaN transform', async ({ page, workspace }) => {
		// Regression: building the map while its panel was hidden fit against a 0x0
		// box, producing translate(NaN,NaN) and a tree shoved off the right edge.
		// Building on show, after a layout frame, keeps it inside the panel.
		await showMap(page, workspace);
		const health = await page.evaluate((sel) => {
			const svg = document.querySelector(sel) as SVGSVGElement;
			const g = svg.querySelector('g') as SVGGElement;
			const s = svg.getBoundingClientRect();
			const c = g.getBoundingClientRect();
			return {
				transform: g.getAttribute('transform') ?? '',
				fitsHoriz: c.left >= s.left - 1 && c.right <= s.right + 1,
				fitsVert: c.top >= s.top - 1 && c.bottom <= s.bottom + 1
			};
		}, MAP);
		expect(health.transform).not.toContain('NaN');
		expect(health.fitsHoriz).toBe(true);
		expect(health.fitsVert).toBe(true);
	});

	test('successive documents each fit the panel', async ({ page, workspace }) => {
		// Regression: setData is async, so a synchronous fit after it read the
		// prior tree's bounds — clicking through docs landed the map all over the
		// place (the same doc even gave different positions, some off the edge).
		// Awaiting setData before the fit keeps every document inside the panel.
		await showMap(page, workspace);
		const docs = [
			{ heading: 'Alpha', md: '# Alpha\n\n- one\n- two' },
			{ heading: 'Omega with several child nodes', md: '# Omega with several child nodes\n\n- one\n- two\n- three\n- four' },
			{ heading: 'Bravo', md: '# Bravo' }
		];
		for (const doc of docs) {
			await page.evaluate((detail) => {
				window.dispatchEvent(new CustomEvent('context-reel:to-editor', { detail }));
			}, doc.md);
			// Wait for the new tree to paint before measuring — no fixed sleep.
			await expect(page.locator(MAP).getByText(doc.heading).first()).toBeVisible();
			const health = await page.evaluate((sel) => {
				const svg = document.querySelector(sel) as SVGSVGElement;
				const g = svg.querySelector('g') as SVGGElement;
				const s = svg.getBoundingClientRect();
				const c = g.getBoundingClientRect();
				return {
					transform: g.getAttribute('transform') ?? '',
					fitsHoriz: c.left >= s.left - 1 && c.right <= s.right + 1
				};
			}, MAP);
			expect(health.transform).not.toContain('NaN');
			expect(health.fitsHoriz).toBe(true);
		}
	});
});

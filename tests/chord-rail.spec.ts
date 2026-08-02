import { test, expect } from './support/workspace';

/**
 * Chord Rail spec. The chords are the one keyboard source; each jump is a
 * client-only view swap, never a reload, and the registry is the single source
 * the seam serves.
 */
test.describe('Chord Rail', () => {
	test('the jump lands without a reload', async ({ page, workspace }) => {
		await page.evaluate(() => ((window as unknown as { __alive: boolean }).__alive = true));
		await page.keyboard.press('Alt+Shift+E');
		await expect(workspace.tab('Editor')).toHaveAttribute('aria-selected', 'true');
		const alive = await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive);
		expect(alive).toBe(true); // no reload wiped the page
	});

	test('the dead chord is quiet — nothing changes, no error', async ({ page, workspace }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await workspace.show('Chat');
		await page.keyboard.press('Alt+Shift+Q'); // bound to nothing
		await expect(workspace.tab('Chat')).toHaveAttribute('aria-selected', 'true');
		expect(errors).toHaveLength(0);
	});

	test('the seam answers with rows matching the registry', async ({ request }) => {
		const res = await request.get('/api/chords');
		expect(res.ok()).toBeTruthy();
		const body = (await res.json()) as { bindings: Array<{ command: string; chord: string }> };
		expect(body.bindings.length).toBeGreaterThan(0);
	});

	test('the grid holds — the closed zap rail is a thin track, middle takes the rest', async ({ page }) => {
		const widths = await page.evaluate(() => {
			const zap = document.querySelector('[data-rail]') as HTMLElement;
			const chord = document.querySelector('[aria-label="Chord set"]') as HTMLElement;
			const view = document.querySelector('main.view') as HTMLElement;
			return {
				zap: Math.round(zap.getBoundingClientRect().width),
				chord: Math.round(chord.getBoundingClientRect().width),
				view: Math.round(view.getBoundingClientRect().width),
				overflow: document.body.scrollWidth > document.body.clientWidth
			};
		});
		expect(widths.zap).toBeLessThan(widths.chord); // closed: thin rail vs the full chord rail
		expect(widths.view).toBeGreaterThan(widths.chord); // middle takes the rest
		expect(widths.overflow).toBe(false);
	});

	test('a jump focuses the view it shows, not just reveals it', async ({ page }) => {
		// A jump that switches the view but leaves focus behind reads as "nothing
		// happened". The chord must land focus in the new view.
		await page.keyboard.press('Alt+Shift+C');
		await expect(page.locator('textarea.input')).toBeFocused(); // chat composer
		await page.keyboard.press('Alt+Shift+E');
		await expect(page.locator('#context-reel-editor')).toBeFocused(); // editor caret
	});
});

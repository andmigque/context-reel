import { test, expect, type Page } from '@playwright/test';

/**
 * ZapRail spec. The one document rail pages docs from disk grouped by source
 * path, loads one into the editor over the to-editor channel, and pages in the
 * next slice when its last row reveals. Each test maps to a Given/When/Then
 * block in spec/zaprail.spec.md.
 *
 * Self-contained boot: this spec waits on real selectors ([data-rail] and the
 * enhanced editor wrapper) rather than the shared roster boot, so it never
 * depends on view-specific markup it does not exercise.
 */
async function boot(page: Page): Promise<void> {
	await page.goto('/');
	await page.evaluate(() => localStorage.clear());
	await page.goto('/');
	await page.locator('.markdown-editor-wrapper').waitFor({ state: 'attached' });
	await page.locator('[data-rail]').waitFor({ state: 'attached' });
}

test.describe('ZapRail', () => {
	// --- Software Interfaces: the source seam ---

	test('the list seam answers a page grouped by source path', async ({ request }) => {
		const res = await request.get('/api/docs?page=1');
		expect(res.ok()).toBeTruthy();
		const body = (await res.json()) as {
			page: number;
			hasMore: boolean;
			groups: Array<{ path: string; docs: Array<{ id: string; title: string; path: string }> }>;
		};
		expect(body.page).toBe(1);
		expect(body.groups.length).toBeGreaterThan(0);
		expect(body.groups.map((g) => g.path)).toContain('guide');
		const firstRow = body.groups[0].docs[0] as Record<string, unknown>;
		expect(firstRow).not.toHaveProperty('text');
	});

	test('the text seam returns a body by id and 404s an unknown id', async ({ request }) => {
		const list = await (await request.get('/api/docs?page=1')).json();
		const id = list.groups[0].docs[0].id as string;
		const ok = await request.get(`/api/docs/${id}`);
		expect(ok.ok()).toBeTruthy();
		expect(((await ok.json()) as { text: string }).text.length).toBeGreaterThan(0);

		const missing = await request.get('/api/docs/not-a-real-id');
		expect(missing.status()).toBe(404);
	});

	test('the text seam rejects a path that climbs out of the doc root', async ({ request }) => {
		const traversalId = Buffer.from('../../package.json', 'utf8').toString('base64url');
		expect((await request.get(`/api/docs/${traversalId}`)).status()).toBe(404);
	});

	// --- Open, focus, close ---

	test('Alt+Shift+ArrowLeft opens the ZapRail and lands focus on a doc', async ({ page }) => {
		await boot(page);
		await page.keyboard.press('Alt+Shift+ArrowLeft');
		await expect(page.locator('aside[aria-label="ZapRail"]')).toBeVisible();
		await expect(page.locator('.doc').first()).toBeFocused();
	});

	test('closed, the ZapRail is a thin track that reopens', async ({ page }) => {
		await boot(page);
		await expect(page.locator('button[aria-label="Open ZapRail"]')).toBeVisible();
		await expect(page.locator('aside[aria-label="ZapRail"]')).toHaveCount(0);
	});

	test('the chord closes the ZapRail and returns focus to the editor', async ({ page }) => {
		await boot(page);
		await page.keyboard.press('Alt+Shift+ArrowLeft');
		await expect(page.locator('aside[aria-label="ZapRail"]')).toBeVisible();
		await page.keyboard.press('Alt+Shift+ArrowLeft');
		await expect(page.locator('aside[aria-label="ZapRail"]')).toHaveCount(0);
		await expect(page.locator('#context-reel-editor')).toBeFocused();
	});

	// --- Disk loading and grouping ---

	test('the open ZapRail renders disk docs grouped by source path', async ({ page }) => {
		await boot(page);
		await page.keyboard.press('Alt+Shift+ArrowLeft');
		const heads = page.locator('aside[aria-label="ZapRail"] .group-head');
		await expect(heads.filter({ hasText: 'guide' })).toHaveCount(1);
		await expect(heads.filter({ hasText: 'policy' })).toHaveCount(1);
	});

	test('Alt+Shift+ArrowLeft then Enter loads the landed doc into the editor', async ({ page }) => {
		await boot(page);
		await page.keyboard.press('Alt+Shift+ArrowLeft');
		await expect(page.locator('.doc').first()).toBeFocused();
		await page.keyboard.press('Enter');
		// The first doc by sort is the root welcome.md; its body lands in the editor.
		await expect(page.locator('#context-reel-editor')).toHaveValue(/# Welcome/);
		// The view never changed — only chords change views.
		await expect(page.getByRole('tab', { name: 'Editor', exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	// --- Infinite scroll: the reveal trigger pages in the next slice ---

	test('revealing the last row pages in the next slice from the source', async ({ page }) => {
		await boot(page);
		const rows = (count: number, start: number) =>
			Array.from({ length: count }, (_, i) => ({
				id: `m${start + i}`,
				title: `mock-${start + i}.md`,
				path: 'mock'
			}));

		await page.route(/\/api\/docs\?page=1$/, (route) =>
			route.fulfill({ json: { page: 1, hasMore: true, groups: [{ path: 'mock', docs: rows(35, 0) }] } })
		);
		await page.route(/\/api\/docs\?page=2$/, (route) =>
			route.fulfill({ json: { page: 2, hasMore: false, groups: [{ path: 'mock', docs: rows(6, 35) }] } })
		);

		await page.keyboard.press('Alt+Shift+ArrowLeft');
		await expect(page.locator('.doc').filter({ hasText: 'mock-0.md' })).toBeVisible();
		await expect(page.locator('.doc').filter({ hasText: 'mock-35.md' })).toHaveCount(0);

		// Bring the last page-1 row into view; its reveal trigger pulls page 2.
		await page.locator('.doc').filter({ hasText: 'mock-34.md' }).scrollIntoViewIfNeeded();
		await expect(page.locator('.doc').filter({ hasText: 'mock-35.md' })).toBeVisible();
	});
});
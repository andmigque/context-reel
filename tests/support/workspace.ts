import { test as base, expect, type Page, type Locator } from '@playwright/test';

/** The app's IndexedDB database; wiped between tests for a known start state. */
const DB_NAME = 'context-reel';

/** The four views the navbar can show. */
export type ViewTab = 'Editor' | 'Chat' | 'Config' | 'MarkMap';

/**
 * Boot a clean workspace: clear persisted state, reload, and wait until the
 * client has hydrated. Before that wait lands, tab clicks hit un-hydrated
 * buttons and the IndexedDB stores do not yet exist — every interaction would
 * race the boot.
 */
async function bootClean(page: Page): Promise<void> {
	await page.goto('/');
	await page.evaluate(async (db) => {
		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase(db);
			req.onsuccess = req.onerror = req.onblocked = () => resolve();
		});
		localStorage.clear();
	}, DB_NAME);
	await page.goto('/');
	await page.locator('.markdown-editor-wrapper').waitFor({ state: 'attached' });
	await page.locator('.chip', { hasText: 'Claude' }).first().waitFor({ state: 'attached' });
}

/**
 * Page object for the workspace shell — view navigation and the one editor
 * seam the tests share. View-specific interactions stay in each spec; this
 * holds only what crosses specs.
 */
export class Workspace {
	constructor(private readonly page: Page) {}

	/** The navbar tab for a view, for clicking or asserting its selected state. */
	tab(name: ViewTab): Locator {
		return this.page.getByRole('tab', { name, exact: true });
	}

	/** Navigate to a view by clicking its tab. */
	async show(name: ViewTab): Promise<void> {
		await this.tab(name).click();
	}

	/**
	 * Write the editor document and fire input, so the editor persists it to
	 * local storage — the same value the markmap reads back.
	 */
	async setEditorDoc(text: string): Promise<void> {
		const editor = this.page.locator('#context-reel-editor');
		await editor.fill(text);
		await editor.dispatchEvent('input');
	}
}

/**
 * The acceptance harness. Every test drives the real workspace against a real
 * stream, the real IndexedDB, and the real enhanced textarea — no stubs.
 *
 * `page` is overridden to arrive booted clean, so any test that touches the UI
 * starts from a known state. Request-only tests pull `request` alone and never
 * instantiate `page`, so they skip the boot.
 */
export const test = base.extend<{ workspace: Workspace }>({
	page: async ({ page }, use) => {
		await bootClean(page);
		await use(page);
	},
	workspace: async ({ page }, use) => {
		await use(new Workspace(page));
	}
});

export { expect };

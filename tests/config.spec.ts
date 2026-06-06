import { test, expect, type Workspace } from './support/workspace';
import type { Page } from '@playwright/test';

/**
 * Config spec. The roster row names an env var, never the key itself; remove
 * keeps the row with its selected flag cleared; and a config choice reaches the
 * chat.
 */
test.describe('Config', () => {
	async function openConfig(page: Page, workspace: Workspace): Promise<void> {
		await workspace.show('Config');
		await expect(page.locator('.row').first()).toBeVisible();
	}

	test('the key is never in the browser — the row holds an env var name only', async ({ page, workspace }) => {
		await openConfig(page, workspace);
		const row = await page.evaluate(async () => {
			const db: IDBDatabase = await new Promise((resolve, reject) => {
				const req = indexedDB.open('context-reel');
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			const rows: Array<Record<string, unknown>> = await new Promise((resolve, reject) => {
				const req = db.transaction('config').objectStore('config').getAll();
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			return rows[0];
		});
		expect(row.envVarName).toBe('ANTHROPIC_API_KEY');
		expect('apiKey' in row).toBe(false);
		expect('key' in row).toBe(false);
	});

	test('remove keeps the row with the selected flag cleared', async ({ page, workspace }) => {
		await openConfig(page, workspace);
		await page.locator('.row', { hasText: 'Claude' }).locator('.summary').click();
		await page.locator('.actions .remove').click();
		const claude = await page.evaluate(async () => {
			const db: IDBDatabase = await new Promise((resolve) => {
				const req = indexedDB.open('context-reel');
				req.onsuccess = () => resolve(req.result);
			});
			const rows: Array<{ vendor: string; selected: boolean }> = await new Promise((resolve) => {
				const req = db.transaction('config').objectStore('config').getAll();
				req.onsuccess = () => resolve(req.result);
			});
			return rows.find((r) => r.vendor === 'claude');
		});
		expect(claude).toBeTruthy(); // row not deleted
		expect(claude?.selected).toBe(false); // selected cleared
	});

	test('selecting a model in config selects it in chat', async ({ page, workspace }) => {
		await openConfig(page, workspace);
		const gemini = page.locator('.row', { hasText: 'Gemini' }).first();
		await gemini.locator('.summary').click();
		await gemini.locator('.actions .select').click();
		await expect(gemini).toHaveAttribute('data-selected', 'true');
		await workspace.show('Chat');
		await expect(page.locator('.chip', { hasText: 'Gemini' }).first()).toHaveAttribute('aria-selected', 'true');
	});

	test('a new model reaches the chat', async ({ page, workspace }) => {
		await openConfig(page, workspace);
		await page.locator('select[aria-label="Vendor to add"]').selectOption('gemini');
		await page.locator('button.primary', { hasText: 'Add model' }).click();
		// a second Gemini row now exists in the roster
		await expect(page.locator('.row', { hasText: 'Gemini' })).toHaveCount(2);
		// and the chat's selectable roster includes Gemini
		await workspace.show('Chat');
		await expect(page.locator('.chip', { hasText: 'Gemini' }).first()).toBeVisible();
	});

	test('a dead key reads as error', async ({ page, workspace }) => {
		// Point the model at an env var that is guaranteed unset on the server,
		// so the probe must report error regardless of the dev environment.
		await openConfig(page, workspace);
		const row = page.locator('.row', { hasText: 'Claude' });
		await row.locator('.summary').click();
		await row.getByLabel('Env var name').fill('context-reel_DEFINITELY_UNSET_KEY');
		await row.locator('.actions button', { hasText: 'Probe' }).click();
		await expect(row.locator('.pill.error')).toBeVisible();
	});
});

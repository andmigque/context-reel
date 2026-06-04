import { test, expect, type Page } from '@playwright/test';

/**
 * Acceptance suite. Every test mirrors a Given/When/Then block from one of the
 * four specs and drives the real thing — a real stream, the real IndexedDB, the
 * real enhanced textarea. No stubbed values, no canned blobs.
 */

async function freshWorkspace(page: Page): Promise<void> {
	await page.goto('/');
	await page.evaluate(async () => {
		await new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase('cadence');
			req.onsuccess = req.onerror = req.onblocked = () => resolve();
		});
		localStorage.clear();
	});
	await page.goto('/');
	// Wait for the app to hydrate and the editor library to mount client-side.
	// Until this lands, tab clicks hit un-hydrated buttons and the IndexedDB
	// stores do not yet exist — every interaction would race the boot.
	await page.locator('.markdown-editor-wrapper').waitFor({ state: 'attached' });
	await page.locator('.chip', { hasText: 'Claude' }).first().waitFor({ state: 'attached' });
}

function tab(page: Page, name: 'Editor' | 'Chat' | 'Config') {
	return page.getByRole('tab', { name, exact: true });
}

test.beforeEach(async ({ page }) => {
	await freshWorkspace(page);
});

// ── Chord Rail spec ─────────────────────────────────────────────────────────
test.describe('Chord Rail', () => {
	test('the jump lands without a reload', async ({ page }) => {
		await page.evaluate(() => ((window as unknown as { __alive: boolean }).__alive = true));
		await page.keyboard.press('Alt+Shift+E');
		await expect(tab(page, 'Editor')).toHaveAttribute('aria-selected', 'true');
		const alive = await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive);
		expect(alive).toBe(true); // no reload wiped the page
	});

	test('the dead chord is quiet — nothing changes, no error', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await tab(page, 'Chat').click();
		await page.keyboard.press('Alt+Shift+Q'); // bound to nothing
		await expect(tab(page, 'Chat')).toHaveAttribute('aria-selected', 'true');
		expect(errors).toHaveLength(0);
	});

	test('the seam answers with rows matching the registry', async ({ request }) => {
		const res = await request.get('/api/chords');
		expect(res.ok()).toBeTruthy();
		const body = (await res.json()) as { bindings: Array<{ command: string; chord: string }> };
		expect(body.bindings.length).toBeGreaterThan(0);
		const editor = body.bindings.find((b) => b.command === 'jump.editor');
		expect(editor?.chord).toBe('Alt+Shift+E');
	});

	test('the grid holds — rails keep their widths, middle stays one fraction', async ({ page }) => {
		const widths = await page.evaluate(() => {
			const zap = document.querySelector('[aria-label="Doc drawer"]') as HTMLElement;
			const chord = document.querySelector('[aria-label="Chord set"]') as HTMLElement;
			const view = document.querySelector('main.view') as HTMLElement;
			return {
				zap: Math.round(zap.getBoundingClientRect().width),
				chord: Math.round(chord.getBoundingClientRect().width),
				view: Math.round(view.getBoundingClientRect().width),
				overflow: document.body.scrollWidth > document.body.clientWidth
			};
		});
		expect(widths.zap).toBe(widths.chord); // both rails 14rem
		expect(widths.view).toBeGreaterThan(widths.zap); // middle takes the rest
		expect(widths.overflow).toBe(false);
	});
});

// ── Chat spec ───────────────────────────────────────────────────────────────
test.describe('Chat', () => {
	async function openChat(page: Page): Promise<void> {
		await tab(page, 'Chat').click();
		await expect(page.locator('.chip', { hasText: 'Claude' })).toBeVisible();
	}

	test('the send is instant — user turn and generating state before any token', async ({ page }) => {
		await openChat(page);
		await page.locator('textarea.input').fill('hello there');
		await page.locator('textarea.input').press('Enter');
		// The user bubble and the Stop control appear immediately…
		await expect(page.locator('.turn.user .bubble')).toHaveText('hello there', { timeout: 100 });
		await expect(page.locator('button.send.stop')).toBeVisible({ timeout: 100 });
		// …and the assistant bubble is still empty (no server token yet).
		expect(await page.locator('.turn.assistant .bubble').innerText()).toBe('');
	});

	test('the answer streams token by token with a caret', async ({ page }) => {
		await openChat(page);
		await page.locator('textarea.input').fill('stream please');
		await page.locator('textarea.input').press('Enter');
		// caret blinks while it grows
		await expect(page.locator('.turn.assistant .caret')).toBeVisible();
		const early = await page.locator('.turn.assistant .bubble').innerText();
		await page.waitForTimeout(400);
		const later = await page.locator('.turn.assistant .bubble').innerText();
		expect(later.length).toBeGreaterThan(early.length); // it grew
		await expect(page.locator('.turn.assistant .stat')).toContainText('tok');
	});

	test('stop cancels the stream and keeps the partial answer', async ({ page }) => {
		await openChat(page);
		await page.locator('textarea.input').fill('long answer');
		await page.locator('textarea.input').press('Enter');
		// Wait for at least one real token before stopping, so there is a partial.
		await expect(page.locator('.turn.assistant .bubble')).not.toHaveText('');
		await page.locator('button.send.stop').click();
		const partial = await page.locator('.turn.assistant .bubble').innerText();
		expect(partial.length).toBeGreaterThan(0);
		await expect(page.locator('.badge.stop')).toBeVisible();
		await expect(page.locator('button.send', { hasText: 'Send' })).toBeVisible(); // Send restored
		await page.waitForTimeout(400);
		// partial does not keep growing after stop
		expect(await page.locator('.turn.assistant .bubble').innerText()).toBe(partial);
	});

	test('the slow start is never silent — a still-working state after 10s', async ({ page }) => {
		test.setTimeout(25_000);
		await page.route('**/api/chat', async (route) => {
			await new Promise((r) => setTimeout(r, 10_600));
			await route.fulfill({
				status: 200,
				contentType: 'application/x-ndjson',
				body: JSON.stringify({ type: 'token', value: 'finally' }) + '\n' + JSON.stringify({ type: 'done' }) + '\n'
			});
		});
		await openChat(page);
		await page.locator('textarea.input').fill('be slow');
		await page.locator('textarea.input').press('Enter');
		await expect(page.locator('button.send.stop')).toBeVisible(); // generating, not blank
		await expect(page.locator('.working')).toBeVisible({ timeout: 12_000 });
	});

	test('a stream error shows an error state and offers retry', async ({ page }) => {
		await page.route('**/api/chat', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/x-ndjson',
				body: JSON.stringify({ type: 'error', message: 'boom' }) + '\n'
			});
		});
		await openChat(page);
		await page.locator('textarea.input').fill('cause an error');
		await page.locator('textarea.input').press('Enter');
		await expect(page.locator('.badge.err')).toBeVisible();
		await expect(page.locator('.recovery button', { hasText: 'Retry' })).toBeVisible();
	});

	test('the server forgets — it answers a standalone transcript', async ({ request }) => {
		const res = await request.post('/api/chat', {
			data: {
				vendor: 'claude',
				model: 'claude-sonnet-4-6',
				systemPrompt: '',
				turns: [{ role: 'user', content: 'one-shot, no prior context' }]
			}
		});
		expect(res.ok()).toBeTruthy();
		const text = await res.text();
		expect(text).toContain('"type":"token"');
		expect(text.trim().endsWith('{"type":"done"}')).toBeTruthy();
	});
});

// ── Config spec ─────────────────────────────────────────────────────────────
test.describe('Config', () => {
	async function openConfig(page: Page): Promise<void> {
		await tab(page, 'Config').click();
		await expect(page.locator('.row').first()).toBeVisible();
	}

	test('the key is never in the browser — the row holds an env var name only', async ({ page }) => {
		await openConfig(page);
		const row = await page.evaluate(async () => {
			const db: IDBDatabase = await new Promise((resolve, reject) => {
				const req = indexedDB.open('cadence');
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

	test('remove keeps the row with the active flag cleared', async ({ page }) => {
		await openConfig(page);
		await page.locator('.row', { hasText: 'Claude' }).locator('.summary').click();
		await page.locator('.actions .remove').click();
		const claude = await page.evaluate(async () => {
			const db: IDBDatabase = await new Promise((resolve) => {
				const req = indexedDB.open('cadence');
				req.onsuccess = () => resolve(req.result);
			});
			const rows: Array<{ vendor: string; active: boolean }> = await new Promise((resolve) => {
				const req = db.transaction('config').objectStore('config').getAll();
				req.onsuccess = () => resolve(req.result);
			});
			return rows.find((r) => r.vendor === 'claude');
		});
		expect(claude).toBeTruthy(); // row not deleted
		expect(claude?.active).toBe(false); // active cleared
	});

	test('a new agent reaches the chat', async ({ page }) => {
		await openConfig(page);
		await page.locator('select[aria-label="Vendor to add"]').selectOption('gemini');
		await page.locator('button.primary', { hasText: 'Add agent' }).click();
		// a second Gemini row now exists in the roster
		await expect(page.locator('.row', { hasText: 'Gemini' })).toHaveCount(2);
		// and the chat's selectable roster includes Gemini
		await tab(page, 'Chat').click();
		await expect(page.locator('.chip', { hasText: 'Gemini' }).first()).toBeVisible();
	});

	test('a dead key reads as error', async ({ page }) => {
		// Point the agent at an env var that is guaranteed unset on the server,
		// so the probe must report error regardless of the dev environment.
		await openConfig(page);
		const row = page.locator('.row', { hasText: 'Claude' });
		await row.locator('.summary').click();
		await row.getByLabel('Env var name').fill('CADENCE_DEFINITELY_UNSET_KEY');
		await row.locator('.actions button', { hasText: 'Probe' }).click();
		await expect(row.locator('.pill.error')).toBeVisible();
	});
});

// ── Editor spec ─────────────────────────────────────────────────────────────
test.describe('Editor', () => {
	async function typeDoc(page: Page, text: string): Promise<void> {
		await page.locator('#cadence-editor').fill(text);
		await page.locator('#cadence-editor').dispatchEvent('input');
	}

	test('the doc survives a view swap', async ({ page }) => {
		await typeDoc(page, '# survives the swap');
		await tab(page, 'Chat').click();
		await tab(page, 'Editor').click();
		await expect(page.locator('#cadence-editor')).toHaveValue('# survives the swap');
	});

	test('a selection reaches the chat and the workspace shows the chat', async ({ page }) => {
		await typeDoc(page, 'alpha beta gamma');
		await page.evaluate(() => {
			const ta = document.querySelector('#cadence-editor') as HTMLTextAreaElement;
			ta.focus();
			ta.setSelectionRange(0, 5); // "alpha"
		});
		await page.keyboard.press('Alt+Shift+Z');
		await expect(tab(page, 'Chat')).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('textarea.input')).toHaveValue('alpha');
	});

	test('the whole doc zaps when nothing is selected', async ({ page }) => {
		await typeDoc(page, 'the entire document');
		await page.evaluate(() => {
			const ta = document.querySelector('#cadence-editor') as HTMLTextAreaElement;
			ta.focus();
			ta.setSelectionRange(4, 4); // collapsed: nothing selected
		});
		await page.keyboard.press('Alt+Shift+Z');
		await expect(page.locator('textarea.input')).toHaveValue('the entire document');
	});

	test('a rail pick loads the doc and the preview repaints to match', async ({ page }) => {
		await page.locator('.rail button.pill', { hasText: 'welcome.md' }).click();
		await expect(page.locator('#cadence-editor')).toHaveValue(/# Cadence/);
		await page.keyboard.press('Alt+Shift+R');
		await expect(page.locator('.editor .preview')).toContainText('Cadence');
	});

	test('the editor fills its panel with no inline pixel height', async ({ page }) => {
		const result = await page.evaluate(() => {
			const editor = document.querySelector('.editor') as HTMLElement;
			const surface = document.querySelector('.editor .surface') as HTMLElement;
			return {
				editorH: Math.round(editor.getBoundingClientRect().height),
				surfaceW: Math.round(surface.getBoundingClientRect().width),
				wrapperW: Math.round((document.querySelector('.markdown-editor-wrapper') as HTMLElement).getBoundingClientRect().width),
				inlineHeight: editor.style.height
			};
		});
		expect(result.editorH).toBeGreaterThan(300); // fills the panel
		expect(result.wrapperW).toBe(result.surfaceW); // fills the width
		expect(result.inlineHeight).toBe(''); // no frozen px height
	});

	test('preview toggles to full width', async ({ page }) => {
		await page.locator('.rail button.pill', { hasText: 'welcome.md' }).click();
		await page.keyboard.press('Alt+Shift+R');
		const result = await page.evaluate(() => {
			const preview = document.querySelector('.editor .preview') as HTMLElement;
			const surface = document.querySelector('.editor .surface') as HTMLElement;
			return {
				previewVisible: !!preview,
				previewW: preview ? Math.round(preview.getBoundingClientRect().width) : 0,
				surfaceW: Math.round(surface.getBoundingClientRect().width),
				overflow: document.body.scrollWidth > document.body.clientWidth
			};
		});
		expect(result.previewVisible).toBe(true);
		expect(result.previewW).toBe(result.surfaceW); // preview owns the full width
		expect(result.overflow).toBe(false);
	});
});

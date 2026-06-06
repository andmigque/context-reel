import { test, expect, type Workspace } from './support/workspace';
import type { Page } from '@playwright/test';

/**
 * Chat spec. The send is instant, the answer streams token by token, stop keeps
 * the partial, and the server forgets — every turn is a standalone transcript.
 */
test.describe('Chat', () => {
	async function openChat(page: Page, workspace: Workspace): Promise<void> {
		await workspace.show('Chat');
		await expect(page.locator('.chip', { hasText: 'Claude' })).toBeVisible();
	}

	test('the send is instant — user turn and generating state before any token', async ({ page, workspace }) => {
		await openChat(page, workspace);
		await page.locator('textarea.input').fill('hello there');
		await page.locator('textarea.input').press('Enter');
		// The user bubble and the Stop control appear immediately…
		await expect(page.locator('.turn.user .bubble')).toHaveText('hello there', { timeout: 100 });
		await expect(page.locator('button.send.stop')).toBeVisible({ timeout: 100 });
		// …and the assistant bubble is still empty (no server token yet).
		expect(await page.locator('.turn.assistant .bubble').innerText()).toBe('');
	});

	test('the answer streams token by token with a caret', async ({ page, workspace }) => {
		await openChat(page, workspace);
		await page.locator('textarea.input').fill('stream please');
		await page.locator('textarea.input').press('Enter');
		// caret blinks while it grows
		await expect(page.locator('.turn.assistant .caret')).toBeVisible();
		const early = await page.locator('.turn.assistant .bubble').innerText();
		// It's a live model: wait until the bubble grows past the first sample
		// rather than checking once after a fixed window a slow stream can miss.
		await expect
			.poll(async () => (await page.locator('.turn.assistant .bubble').innerText()).length, {
				timeout: 10_000
			})
			.toBeGreaterThan(early.length); // it grew
		await expect(page.locator('.turn.assistant .stat')).toContainText('tok');
	});

	test('stop cancels the stream and keeps the partial answer', async ({ page, workspace }) => {
		await openChat(page, workspace);
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

	test('the slow start is never silent — a still-working state after 10s', async ({ page, workspace }) => {
		test.setTimeout(25_000);
		await page.route('**/api/chat', async (route) => {
			await new Promise((r) => setTimeout(r, 10_600));
			await route.fulfill({
				status: 200,
				contentType: 'application/x-ndjson',
				body: JSON.stringify({ type: 'token', value: 'finally' }) + '\n' + JSON.stringify({ type: 'done' }) + '\n'
			});
		});
		await openChat(page, workspace);
		await page.locator('textarea.input').fill('be slow');
		await page.locator('textarea.input').press('Enter');
		await expect(page.locator('button.send.stop')).toBeVisible(); // generating, not blank
		await expect(page.locator('.working')).toBeVisible({ timeout: 12_000 });
	});

	test('a stream error shows an error state and offers retry', async ({ page, workspace }) => {
		await page.route('**/api/chat', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/x-ndjson',
				body: JSON.stringify({ type: 'error', message: 'boom' }) + '\n'
			});
		});
		await openChat(page, workspace);
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
				envVarName: 'ANTHROPIC_API_KEY',
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

import { test, expect } from './support/workspace';

/**
 * Editor spec. The document is the textarea value, persisted to local storage;
 * it survives a view swap, zaps a selection (or the whole doc) to the chat, and
 * fills its panel with no frozen pixel height.
 */
test.describe('Editor', () => {
	test('the doc survives a view swap', async ({ page, workspace }) => {
		await workspace.setEditorDoc('# survives the swap');
		await workspace.show('Chat');
		await workspace.show('Editor');
		await expect(page.locator('#context-reel-editor')).toHaveValue('# survives the swap');
	});

	test('a selection reaches the chat and the workspace shows the chat', async ({ page, workspace }) => {
		await workspace.setEditorDoc('alpha beta gamma');
		await page.evaluate(() => {
			const ta = document.querySelector('#context-reel-editor') as HTMLTextAreaElement;
			ta.focus();
			ta.setSelectionRange(0, 5); // "alpha"
		});
		await page.keyboard.press('Alt+Shift+Z');
		await expect(workspace.tab('Chat')).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('textarea.input')).toHaveValue('alpha');
	});

	test('the whole doc zaps when nothing is selected', async ({ page, workspace }) => {
		await workspace.setEditorDoc('the entire document');
		await page.evaluate(() => {
			const ta = document.querySelector('#context-reel-editor') as HTMLTextAreaElement;
			ta.focus();
			ta.setSelectionRange(4, 4); // collapsed: nothing selected
		});
		await page.keyboard.press('Alt+Shift+Z');
		await expect(page.locator('textarea.input')).toHaveValue('the entire document');
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

	test('edit and preview both sit on the dark surface', async ({ page, workspace }) => {
		await workspace.setEditorDoc('# theme parity');
		const wrapper = page.locator('.markdown-editor-wrapper');
		await expect(wrapper).toHaveAttribute('data-theme', 'dark');
		const editBg = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(editBg).not.toBe('rgb(255, 255, 255)');
	});

	test('a preview table renders with cell borders and padding', async ({ page, workspace }) => {
		await workspace.setEditorDoc('| a | b |\n| --- | --- |\n| 1 | 2 |');
		await page.keyboard.press('Alt+Shift+R');
		const cell = page.locator('.editor .preview td').first();
		await expect(cell).toBeVisible();
		const box = await cell.evaluate((el) => {
			const s = getComputedStyle(el);
			return { border: s.borderTopWidth, padX: s.paddingLeft, padY: s.paddingTop };
		});
		expect(parseFloat(box.border)).toBeGreaterThan(0);
		expect(parseFloat(box.padX)).toBeGreaterThan(0);
		expect(parseFloat(box.padY)).toBeGreaterThan(0);
	});

	test('preview toggles to full width', async ({ page }) => {
		await page.keyboard.press('Alt+Shift+ArrowLeft'); // open the doc rail
		await page.locator('button.doc', { hasText: 'welcome.md' }).click();
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

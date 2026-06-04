import { defineConfig, devices } from '@playwright/test';

/**
 * The acceptance suite drives the real workspace against a real stream, a real
 * IndexedDB, and the real enhanced textarea — never a stub. Each test maps to a
 * Given/When/Then block from one of the four specs.
 */
export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 120_000
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});

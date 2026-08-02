import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';

// Unit tests run on Vitest, scoped to src/** so they never collide with the
// Playwright acceptance suite in ./tests. The Svelte plugin compiles the
// *.svelte.ts rune stores; the 'browser' resolve condition gives those runes
// their client reactivity under jsdom. No browser is launched.
export default defineConfig({
	plugins: [svelte({ hot: false })],
	resolve: {
		conditions: ['browser'],
		alias: { $lib: path.resolve('./src/lib') }
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.ts'],
		globals: true
	}
});

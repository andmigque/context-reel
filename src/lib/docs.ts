/** A markdown doc the zap rail can load into the editor. */
export interface Doc {
	id: string;
	title: string;
	text: string;
}

/**
 * Stand-in doc set for the zap rail. In the full workspace these come from the
 * doc tree, paged as you scroll; here they seed the in-zap so a pill click has
 * something real to load.
 */
export const SAMPLE_DOCS: Doc[] = [
	{
		id: 'welcome',
		title: 'welcome.md',
		text: [
			'# Cadence',
			'',
			'A keyboard-chorded workspace. The center swaps; the frame stays.',
			'',
			'- **Alt+Shift+E** — editor',
			'- **Alt+Shift+C** — chat',
			'- **Alt+Shift+K** — config',
			'- **Alt+Shift+Z** — zap this doc into the chat',
			'- **Alt+Shift+R** — toggle the preview',
			'',
			'The text is the truth. Write here, zap a piece into the chat, watch it answer.'
		].join('\n')
	},
	{
		id: 'scratch',
		title: 'scratch.md',
		text: '# Scratch\n\nStart typing. Every change persists across a view swap and a reload.\n'
	},
	{
		id: 'snippet',
		title: 'snippet.md',
		text: [
			'## A code snippet',
			'',
			'```ts',
			'const answer = stream(transcript); // transcript -> tokens',
			'```',
			'',
			'Select a line, press Alt+Shift+Z, and the chat picks it up.'
		].join('\n')
	}
];

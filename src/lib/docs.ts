//// # docs
//// The Doc shape the ZapRail lists and loads into the editor, plus the page shapes the disk-backed
//// source endpoint returns. A fixed sample set seeds tests and serves as an offline fallback.
////
//// ## Types

//// ### Doc
//// A markdown doc the ZapRail can load into the editor.
export interface Doc {
	//// - `string`: __id__
	////     - *Stable, opaque identifier for the doc.*
	id: string;
	//// - `string`: __title__
	////     - *Display title, e.g. "welcome.md".*
	title: string;
	//// - `string`: __path__
	////     - *Source path on disk, relative to the doc root. '' for a doc at the root.*
	path: string;
	//// - `string`: __text__
	////     - *The markdown body.*
	text: string;
}

//// ### DocMeta
//// One doc list row: metadata only, no text. A page carries these; the body loads on activate.
export interface DocMeta {
	//// - `string`: __id__
	////     - *Stable, opaque identifier for the doc.*
	id: string;
	//// - `string`: __title__
	////     - *Display title.*
	title: string;
	//// - `string`: __path__
	////     - *Source path, relative to the doc root.*
	path: string;
}

//// ### DocGroup
//// Rows that share one source path, rendered under a single path heading.
export interface DocGroup {
	//// - `string`: __path__
	////     - *The shared source path.*
	path: string;
	//// - `DocMeta[]`: __docs__
	////     - *The rows under this path, in page order.*
	docs: DocMeta[];
}

//// ### DocPage
//// One fixed-size slice of the doc list, grouped by source path.
export interface DocPage {
	//// - `number`: __page__
	////     - *The 1-based page number this slice answers.*
	page: number;
	//// - `boolean`: __hasMore__
	////     - *False on the last page; the ZapRail stops requesting once it sees false.*
	hasMore: boolean;
	//// - `DocGroup[]`: __groups__
	////     - *The page's rows, grouped by source path.*
	groups: DocGroup[];
}

//// ## Constants

//// ### SAMPLE_DOCS
//// Fixed sample set. Seeds the unit tests and stands in as an offline fallback when the source
//// endpoint returns nothing. In the running app the ZapRail pages real docs from the doc root.
export const SAMPLE_DOCS: Doc[] = [
	{
		id: 'welcome',
		title: 'welcome.md',
		path: 'sample',
		text: [
			'# Context Reel',
			'',
			'_N_ Models, 1 History.',
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
		path: 'sample',
		text: '# Scratch\n\nStart typing. Every change persists across a view swap and a reload.\n'
	},
	{
		id: 'snippet',
		title: 'snippet.md',
		path: 'sample',
		text: [
			'## A code snippet',
			'',
			'```ts',
			'const answer = stream(history); // history -> tokens',
			'```',
			'',
			'Select a line, press Alt+Shift+Z, and the chat picks it up.'
		].join('\n')
	}
];
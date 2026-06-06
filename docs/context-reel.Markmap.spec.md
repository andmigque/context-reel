# context-reel markmap spec

The document is the truth. The markmap is a lens.

## Status

Implemented. The forks the review owned are resolved below;
one genuine deferral (the source's future home) remains open.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
in this document are to be interpreted as described in
RFC 2119 and RFC 8174 when, and only when, they appear in
all capitals.

## Document Type

This is a design doc.

It pins one feature: a view that renders the editor's
document as an interactive markmap. It is one new view,
one read seam to the editor's document, and one rendering
library. It is not contractual, so it is not an SRS. It is
more than one decision, so it is not an ADR.

## Context

context-reel holds one document in the editor. The
document is markdown. The editor persists it to local
storage, and the editor's value is the single source of
truth for that text.

A markmap reads the same markdown and draws its heading and
bullet hierarchy as a foldable, zoomable, pannable tree. It
authors nothing. The markdown is the source; the markmap is
the view. This is the same single-source relationship the
editor already keeps with its preview.

The feature exists working in a sibling example project,
OptimusSharp, as the `sx-markmap` component. That code is
the reference for how the rendering works. It is not the
target stack. OptimusSharp is Razor plus a Lit web
component loading the library from a CDN. context-reel is
SvelteKit plus npm and Vite. The behavior carries over; the
host does not.

## Vocabulary

**markmap** is the view that draws the document as a tree.

**Document** is the markdown the editor owns and persists
to local storage.

**Node** is one heading or bullet rendered as a point in
the tree.

**Fit** is the library action that sizes the whole tree to
the viewport.

**Zap channel** is the editor's existing in-channel: the
window event that delivers a picked document to the editor,
carrying the markdown in its `detail`.

## What The Reference Does

Read from `sx-markmap` so the carry-over is concrete.

- It reads the persisted editor document on mount and
  renders it into an SVG it owns.
- It transforms the markdown to a node tree with
  `markmap-lib`, then renders and fits that tree with
  `markmap-view`.
- It re-renders live when a new document arrives on the zap
  channel, so the map tracks the writing.
- It renders into light DOM, because the library measures
  the SVG through d3 against the document, and a shadow
  root would wall that off and break sizing.
- An empty document falls back to a short placeholder, so
  the panel never paints blank.
- Node text is themed to the palette through the library's
  CSS variables. The branch link colors are left at the
  library default.

## Goals

- The markmap shows the editor's current document as a
  navigable tree.
- The map tracks the document, so editing is reflected
  without a reload.
- The view survives a workspace view swap, like every other
  view.
- The empty state still shows a map.
- One concept has one name across the UI, code, and tests.

## Non-Goals

- The markmap does not edit the document. It is read only.
- The markmap is not a second source of the document.
- The markmap does not replace the editor's preview.
- The markmap does not load the rendering library from a
  CDN. context-reel installs it from npm.
- The markmap does not define a git view or any view other
  than itself.

## Proposed Design

**The view.** A new Svelte component, `Markmap.svelte`,
joins the workspace beside the editor, chat, and config. It
mounts once and is shown or hidden by `workspace.view`, the
same toggle the other views use, so a view swap never
reloads the page and never unmounts the map.

**The source seam.** The component reads the document the
editor persists to local storage. It reads on show and
re-renders when the document changes. It listens on the
editor's zap channel for a live document, so a doc picked
in the doc drawer updates the map while the map is the open
view, the same way the editor reacts.

**The library.** `markmap-lib` provides the transformer
that parses markdown into a node tree. `markmap-view`
provides the renderer that draws the tree into an SVG and
fits it to the viewport. Both are npm dependencies, dynamic
imported in the browser only, so server rendering loads no
map globals.

**The render root.** The SVG renders in light DOM so the
library can measure it. The component owns a unique SVG id
per instance so a re-mount never collides with a stale
target.

**Theming.** Node text is set to the palette through the
library's CSS variables. The branch link palette is the
one open theming question.

**The chord.** A jump shortcut, of the shape
`Alt+Shift+<key>`, selects the markmap view. The command
identity is registered in the chord registry apart from the
key, so a rebind moves the key and leaves the command
alone. The exact key is an open question.

## Requirements

Each requirement is one shape, one capability. If a test
cannot mark it pass or fail, it is not here.

### The view

- context-reel MUST provide a markmap view.
- context-reel MUST keep the markmap view mounted across a
  view swap.
- When the user swaps away from and back to the markmap,
  context-reel MUST NOT reload the page.
- When the user selects the markmap chord, context-reel
  MUST show the markmap view.

### The source

- The markmap MUST render the document the editor persists
  to local storage.
- When the markmap view is shown, the markmap MUST render
  the current document.
- When a document arrives on the editor's zap channel while
  the markmap is built, the markmap MUST re-render from that
  document.
- The markmap MUST NOT write the document.

### The rendering

- The markmap MUST transform the document markdown into a
  node tree before rendering.
- The markmap MUST render the node tree as an SVG markmap.
- On first render, the markmap MUST fit the tree to the
  viewport.
- The markmap MUST let the user fold a node.
- The markmap MUST let the user pan and zoom the tree.
- While the document is empty, the markmap MUST render a
  placeholder document.

### Should and may

- The markmap SHOULD re-fit the tree when the document
  changes.
- The markmap MAY theme the branch links to the palette.
- The markmap MAY expose a control to re-fit on demand.

## Prohibitions

A prohibition is a goal you could chase and choose not to.
It is the floor under the design.

- The markmap MUST NOT persist the document.
- The markmap MUST NOT hold a second copy of the document
  as its own source.
- The markmap MUST NOT load the rendering library from a
  CDN.
- The markmap MUST NOT freeze an inline pixel height on its
  panel. The panel height is fluid.
- The code MUST NOT use the `null` literal.

## Alternatives Considered

**Render from a shared store instead of local storage.**
The editor's source today is its textarea value, persisted
to local storage. Reading the same key keeps one source.
Introducing a store the editor does not yet use would add a
second source to keep in sync. Rejected for now; revisit
when the editor moves to IndexedDB.

**Port the Lit web component verbatim.** The reference is a
Lit element in light DOM. context-reel's other views are
native Svelte components. A Svelte component matches the
codebase and drops the Lit dependency. Wrapping the library
directly in Svelte is chosen. The light-DOM measuring
constraint still holds and carries over.

**Canvas instead of SVG.** The library renders SVG and
gives folding, zoom, and pan for free. A canvas port would
re-implement all of it. Rejected.

**Re-render on a timer.** Polling the document on an
interval is simpler than reacting to change, but it paints
when nothing changed and lags when it did. Reacting to the
zap channel and to show is chosen.

## Cross-Cutting Concerns

**Secrets.** None. The markmap reads a local document and
calls no provider. It touches no key and no env var.

**Performance.** A large document is a large tree. The
markmap SHOULD render a document of at least the size of
this spec without a visible stall. Folding keeps deep trees
navigable.

**Accessibility.** The SVG MUST carry a label naming it as
the document markmap. Folding and pan are pointer-driven in
the reference; keyboard navigation of the tree is a later
concern, not a first-pass requirement.

**Observability.** A transform or render failure MUST leave
the panel showing the placeholder or the prior tree, never
a blank panel or an uncaught error.

## Testing And Acceptance

Each check drives the real view against the real document
and the real library. No stubbed tree.

### The map renders the document

```gherkin
Given the editor holds a document with headings and bullets
When the user shows the markmap
Then the markmap renders a node for the top heading
And the tree is fit within the panel
```

### The map tracks the writing

```gherkin
Given the markmap is the shown view
When a new document arrives on the zap channel
Then the markmap re-renders from the new document
```

### The map survives a view swap

```gherkin
Given the markmap has rendered a document
When the user swaps to the chat and back
Then the markmap still shows the document
And the page did not reload
```

### The empty state still shows a map

```gherkin
Given the editor document is empty
When the user shows the markmap
Then the markmap renders the placeholder document
```

## Resolved Decisions

The review picked one of each fork it owned.

**The view's name in the union.** `markmap`. The workspace
view union reads `markmap`, the component is `Markmap.svelte`,
the chord command is `jump.markmap`, and the tab reads
`MarkMap`. One concept, one name, everywhere.

**The chord key.** `Alt+Shift+M` opens the mind map — M for
map, clear of the held E, C, K and the reserved G.

**The branch palette.** Left at the library default, as in
the `sx-markmap` reference. Node text and inline code theme
to the palette through the library's CSS variables; the
branch links keep the d3 default.

**The re-render trigger beyond the zap.** None. The map
renders what is in the editor: it renders from the zap
channel, and re-reads the editor's document when the view is
shown. It does not observe live editor keystrokes and does
not poll.

## Open Questions

**The source's future home.** The document lives in local
storage today. The product spec names IndexedDB as the
target. When the editor moves, the mind map's read seam
moves with it. The timing is open.

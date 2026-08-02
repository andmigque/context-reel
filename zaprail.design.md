# Zap Rail Design Doc

The ZapRail. One rail, every doc, loaded into the editor.

## Status

Draft.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

## Document Type

This is a Design Document. It defines the design contract for the ZapRail, one support surface of context-reel.

It is not safety-critical or contractual, so it is not an SRS. It is more than one decision, so it is not an ADR. The ambiguity is the ZapRail's shape, its open and closed forms, its keyboard model, how it pages docs in from disk, and how it hands a doc to the editor.

It inherits the vocabulary and trust boundaries of the parent spec, `context-reel.spec.md`.
## Context

context-reel is a chat workspace where multiple frontier models share one history. Chat is the center; the editor, config, the ZapRail, and the chord rail support it.

The ZapRail lists the docs on disk and loads one into the editor on demand. The loaded doc renders in whichever view is open — the editor for authoring, the mind map for structure — because the editor persists it and both views read from it.

The ZapRail has two forms. Open, it is a full-height panel down the left edge. Closed, it is a thin vertical track on the left edge, like a rail line, that the user opens with one chord.

### Built today vs. target

Built today: the docked / slide-in `aside`, a fixed sample list (`SAMPLE_DOCS`), click-to-load over the `context-reel:to-editor` channel, the ZapRail chord toggle and focus-on-open, a green hover state, an amber selected state, a focus ring, and close-on-load for the small-screen slide-in.

Target (this spec adds): a disk-backed doc list paged from a server endpoint, grouped by source path, scrolled in by a reveal trigger on the last row, plus lazy text loading on activate. The closed thin form, the close control, and the keyboard model are already built; this spec ratifies them and adds the disk-backed source.
## Vocabulary

The component has exactly one name: **ZapRail**. No "Doc rail," no "Doc drawer," no synonym — in this spec or in the code.

**ZapRail** is the single document rail on the left edge of the workspace.

**Open ZapRail** is the full panel form: a header, the doc list, and a footer hint.

**Closed ZapRail** is the thin vertical track shown when the ZapRail is closed, like a rail line.

**Doc** is one markdown document the ZapRail can load. A Doc has an `id`, a `title`, a `path` (its source path on disk, relative to the doc root), and `text` (the markdown body). The list carries `id`, `title`, and `path`; `text` arrives later, on activate (see Software Interfaces).

**Doc root** is the single server-side directory the doc source scans. It is read from an environment variable; it is never hardcoded and is never the generated `docs/` tree.

**Doc list** is the scrollable list of docs, grouped by source path.

**Page** is one fixed-size slice of the doc list returned by the source endpoint, addressed by a 1-based page number.

**Reveal trigger** is the behavior that requests the next page when the last rendered row enters the viewport.

**Landed doc** is the doc that currently holds keyboard focus inside the ZapRail.

**Selected doc** is the doc most recently loaded into the editor.

**Load** (or zap) means hand a doc's text to the editor channel so the editor and the open view render it. The channel is the `context-reel:to-editor` event.

**Middle view** is the active workspace view in the center column — editor, chat, config, or mind map.

**ZapRail chord** is `Alt+Shift+ArrowLeft`, the chord that opens and closes the ZapRail (`workspace.openZapDrawer` in the chord registry).
## Goals

- The ZapRail lists every doc under the doc root and loads one into the editor.
- The ZapRail opens, focuses, navigates, loads, and closes entirely from the keyboard.
- Closed, the ZapRail is a thin track that does not take layout space from the middle view.
- Docs page in as the user scrolls, so the list scales past what fits at once, and only what was scrolled to is fetched.
- Colour marks hover, focus, and selection so the eye tracks movement through the list.

## Non-Goals

- The ZapRail does not edit docs; it loads them into the editor.
- The ZapRail does not change the middle view; only chords change views.
- The ZapRail does not own the doc's persistence; the editor persists the loaded doc.
- The ZapRail does not implement the on-disk index or walk; it consumes the paging endpoint defined under Software Interfaces. How that endpoint enumerates and sorts files on disk is an implementation detail out of scope here; its request and response contract is in scope and is fixed below.
- The ZapRail does not present a scrollbar as a visible control.
- The ZapRail does not hand-roll scroll math. It MUST NOT use an `onscroll` offset handler. The reveal trigger is a single reusable Svelte action wrapping one `IntersectionObserver`, declarative at the row.

## Design Decisions

These were open; they are now fixed. Revisit by amending this section.

- **Doc root:** an env-configured content root, grouped by immediate subdirectory. Read from the environment on the server, never hardcoded. The generated `docs/` tree is excluded; it is transient build output.
- **Text delivery:** lazy. A page carries `id`, `title`, and `path` only. A doc's `text` is fetched on activate (`Enter` or click), so a large tree never ships its bodies up front.
- **Infinite scroll mechanism:** a reveal trigger on the last row plus a page-based server endpoint. No observer in the component, no scroll handler.
## Product Requirements

### Layout

- The ZapRail MUST occupy the left column of the workspace, from the navbar down to the bottom edge.
- The open ZapRail MUST keep padding between its right edge and the middle view.
- The ZapRail MUST NOT show a visible scrollbar; overflow scrolls without scrollbar chrome.
- At or above the `rail` breakpoint, the open ZapRail MUST sit in the layout grid (`grid-area: zap`).
- Below the `rail` breakpoint, the ZapRail MUST leave the grid, fix to the left edge, and slide in over the middle view.

### Open and Close

- The ZapRail chord (`Alt+Shift+ArrowLeft`) MUST open the ZapRail from any view.
- The ZapRail chord MUST close an open ZapRail.
- When the ZapRail closes, context-reel MUST return focus to the middle view.
- The open ZapRail MUST show a close control (`×`) at the right of its header.
- Activating the close control MUST close the ZapRail and return focus to the middle view.
- The closed ZapRail MUST render as a thin vertical track on the left edge, not a full panel.
- The closed ZapRail MUST stay reachable, so the ZapRail chord can reopen it.

### Focus and Keyboard Navigation

- When the ZapRail chord opens the ZapRail, context-reel MUST move focus into the ZapRail.
- On open, focus MUST land on a doc (the landed doc), so the next keystroke acts on a doc.
- While the ZapRail holds focus, `Tab` MUST move the landed doc down to the next doc and `Shift+Tab` up to the previous doc — the canonical up/down navigation of a list.
- While the ZapRail holds focus, `Enter` MUST load the landed doc.
- So `Alt+Shift+ArrowLeft` then `Enter` MUST open the ZapRail and load the doc focus lands on, with no mouse.
- Navigation MUST keep the landed doc in view, scrolling the list when focus reaches an edge.
- Each doc row MUST be a real button so `Tab`, `Shift+Tab`, and `Enter` act natively; the ZapRail MUST NOT install a JavaScript keymap to emulate them.
### Doc Loading

- Loading a doc MUST fetch its text from the source (see Software Interfaces), then hand that text to the editor channel (`context-reel:to-editor`); it MUST NOT change the view.
- After a load, the editor MUST persist the doc, and the open view (editor or mind map) MUST render from it.
- Loading a doc from a click MUST behave the same as loading it with `Enter`.
- After a load on the slide-in (small-screen) ZapRail, context-reel SHOULD close the ZapRail; on the docked ZapRail it SHOULD stay open.
- A failed text fetch MUST leave the editor unchanged and MUST NOT mark the doc selected.

### Infinite Scroll and Disk Loading

- The doc list MUST load docs from the doc root on disk, not only the fixed sample set.
- The doc list MUST request the next page when the last rendered row enters the viewport (the reveal trigger), and MUST append that page to the list.
- The list MUST stop requesting once a page reports no more docs (`hasMore` is false).
- The ZapRail MUST group docs by their source path; rows sharing a path render under one path heading.
- The ZapRail MUST fetch only pages the user has scrolled to; it MUST NOT prefetch the whole tree.
- The reveal trigger MUST be a reusable Svelte action wrapping one `IntersectionObserver`. The ZapRail MUST NOT compute scroll offsets in the component.

### Selection and Visual State

- Each doc row MUST show a distinct hover state.
- The ZapRail MUST mark the selected doc with a distinct selected state.
- The landed doc MUST show a visible focus state, distinct from hover and selection.
- Colour MUST serve movement and navigation: hover, focus, and selection each read at a glance.

### Accessibility

- The ZapRail MUST expose the accessible name "ZapRail".
- Each doc row MUST be a real button, reachable and operable from the keyboard.
- The close control MUST have an accessible name.
- Focus order MUST follow the visible doc order.
- A new page appended below MUST NOT move focus off the landed doc.
### Security

- The ZapRail inherits the parent spec's markdown trust boundary: a loaded doc is untrusted markdown, sanitized by the editor and renderers before display. The ZapRail MUST NOT inject doc text as raw HTML.
- The source endpoint MUST serve only files under the doc root. It MUST resolve each candidate path and reject any that escapes the root (path traversal). A doc is addressed by an opaque `id`, never by a client-supplied filesystem path.
- The doc root MUST be read from the environment on the server; it MUST NOT be hardcoded and MUST NOT be echoed to the client.

## Software Interfaces

The ZapRail consumes two server endpoints. Their request and response shapes are fixed here so the client and server never drift. Both follow the project's existing `+server.ts` pattern (see `src/routes/api/chords` and `src/routes/api/probe`).

### List a page of docs

`GET /api/docs?page=<n>`

- `page` is a 1-based integer; absent or invalid means page 1.
- The server pages in fixed-size slices (default 30 rows) sorted by source path then title, so paging is deterministic across requests.
- Response (`200`):

```json
{
  "page": 1,
  "hasMore": true,
  "groups": [
    { "path": "policy", "docs": [ { "id": "a1b2", "title": "access-control.md", "path": "policy" } ] }
  ]
}
```

- `groups` carries rows grouped by source path. Each row is metadata only — `id`, `title`, `path` — never `text`.
- `hasMore` is false on the last page.

### Fetch one doc's text

`GET /api/docs/<id>`

- `id` is the opaque id from a list row.
- Response (`200`): `{ "id": "a1b2", "title": "access-control.md", "path": "policy", "text": "# ...markdown body..." }`.
- An unknown id returns `404`. The text is untrusted markdown; the editor and renderers sanitize it before display.
## Proposed Design

The ZapRail is an `aside` in the workspace grid at `grid-area: zap`. Open, it is a column: a header with the "Docs" title and a close `×`, a scrollable doc list, and a footer hint naming the ZapRail chord.

The ZapRail reads `workspace.drawerOpen`. At or above the `rail` breakpoint the ZapRail is docked in the grid. Below it, the ZapRail leaves the grid, fixes to the left edge, and slides in when `drawerOpen` is true.

The closed form is a thin vertical track on the left edge — a rail line — that the ZapRail chord reopens.

The doc list renders the pages returned by `GET /api/docs?page=N`, grouped by source path. The list holds the accumulated groups, the current page number, and a `hasMore` flag. The last rendered row carries a reveal trigger: a `use:reveal` action that wraps a single `IntersectionObserver` and fires `onreveal` when the row enters the viewport. On reveal, the ZapRail requests the next page and appends it; when `hasMore` is false it stops. This is the htmx infinite-scroll shape — the last row pulls the next page — expressed in the native Svelte idiom, so there is no scroll math and no observer in the component itself. The list scrolls without a visible scrollbar.

Keyboard flow is unchanged and already built: the ZapRail chord opens the ZapRail and moves focus to a doc; rows are real buttons, so `Tab` and `Shift+Tab` move the landed doc and `Enter` activates it natively; the ZapRail chord closes the ZapRail and returns focus to the middle view.

Loading a doc fetches its text from `GET /api/docs/<id>`, then dispatches `context-reel:to-editor` with that text and marks the row selected. The editor persists it and the open view renders it; the view itself does not change. Only chords change views.
## Acceptance Criteria

### Open and focus

```gherkin
Given the user is in any view
When the user presses Alt+Shift+ArrowLeft
Then context-reel opens the ZapRail
And moves focus to a doc in the ZapRail
```

### Open then load with the keyboard

```gherkin
Given the ZapRail is closed
When the user presses Alt+Shift+ArrowLeft and then Enter
Then context-reel fetches the landed doc's text from /api/docs/<id>
And dispatches that text on context-reel:to-editor
And does not change the middle view
```

### Navigate docs

```gherkin
Given the ZapRail holds focus
When the user presses Tab
Then focus moves to the next doc
And when the user presses Shift+Tab focus moves to the previous doc
```

### Close and return focus

```gherkin
Given the ZapRail is open and holds focus
When the user presses Alt+Shift+ArrowLeft
Then context-reel closes the ZapRail
And returns focus to the middle view
```

### Closed thin form

```gherkin
Given the ZapRail is closed
Then context-reel shows a thin vertical track on the left edge
And the ZapRail chord reopens the full ZapRail
```
### First page loads from disk

```gherkin
Given the doc root holds more docs than one page
When the user opens the ZapRail
Then context-reel requests GET /api/docs?page=1
And renders that page's rows grouped by source path
And shows no scrollbar
```

### Infinite scroll pages in from disk

```gherkin
Given the ZapRail shows page 1 and the response had hasMore true
When the last rendered row enters the viewport
Then context-reel requests GET /api/docs?page=2
And appends page 2's rows below page 1
And leaves focus on the landed doc
```

### Scrolling stops at the end

```gherkin
Given the last page returned hasMore false
When the final row enters the viewport
Then context-reel requests no further pages
```

### Grouping by source path

```gherkin
Given a page returns docs sharing the source path "policy"
When the page renders
Then those rows appear under one "policy" heading
And in the order the page returned them
```

### Load hands off to the editor

```gherkin
Given a doc row is focused or clicked
When the user loads it
Then context-reel fetches its text from /api/docs/<id>
And dispatches that text on context-reel:to-editor
And the editor persists it and the open view renders it
And the row shows the selected state
```

### Hover, focus, and selection

```gherkin
Given the doc list is visible
When the user hovers a doc
Then it shows a hover state
And the most recently loaded doc shows a selected state
And the focused doc shows a focus state distinct from both
```

### Path traversal is rejected

```gherkin
Given a request resolves to a path outside the doc root
When the source endpoint handles it
Then it serves no file
And returns an error rather than the out-of-root content
```

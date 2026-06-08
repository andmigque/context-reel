# context-reel ZapRail Spec

The document rail. One rail, every doc, loaded into the editor.

## Status

Draft.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

## Document Type

This is a Design Document. It defines the design contract for the ZapRail, one support surface of context-reel.

It is not safety-critical or contractual, so it is not an SRS. It is more than one decision, so it is not an ADR. The ambiguity is the rail's shape, its open and closed forms, its keyboard model, and how it hands a doc to the editor.

It inherits the vocabulary and trust boundaries of the parent spec, `context-reel.spec.md`.

## Context

context-reel is a chat workspace where multiple frontier models share one history. Chat is the center; the editor, config, document rail, and shortcut rail support it.

The ZapRail is the document rail. It lists the docs on disk and loads one into the editor on demand. The loaded doc renders in whichever view is open — the editor for authoring, the mind map for structure — because the editor persists it and both views read from it.

The rail has two forms. Open, it is a full-height panel down the left edge. Closed, it is a thin vertical track on the left edge, like a rail line, that the user opens with one chord.

### Built today vs. target

Built today: the docked / slide-in `aside`, a fixed sample list (`SAMPLE_DOCS`), click-to-load over the `context-reel:to-editor` channel, the drawer chord toggle, a green hover state, and close-on-load for the small-screen slide-in.

Target (this spec adds): a close control, a disk-backed doc tree grouped by source path, infinite scroll, the full keyboard model, a closed thin-rail form, and explicit selected and focus states.

## Vocabulary

**ZapRail** is the document rail on the left edge. Also called the Doc rail or Doc drawer.

**Open rail** is the full panel form: a header, the doc list, and a footer hint.

**Closed rail** is the thin vertical track shown when the rail is closed, like a rail line.

**Doc** is one markdown document the rail can load. A Doc has an `id`, a `title`, and `text` (see `src/lib/docs.ts`).

**Doc list** is the scrollable list of docs, grouped by source path.

**Landed doc** is the doc that currently holds keyboard focus inside the rail.

**Selected doc** is the doc most recently loaded into the editor.

**Load** (or zap) means hand a doc's text to the editor channel so the editor and the open view render it. The channel is the `context-reel:to-editor` event.

**Middle view** is the active workspace view in the center column — editor, chat, config, or mind map.

**Drawer chord** is `Alt+Shift+ArrowLeft`, the chord that opens and closes the rail (`workspace.openZapDrawer` in the chord registry).

## Goals

- One rail lists every doc on disk and loads one into the editor.
- The rail opens, focuses, navigates, loads, and closes entirely from the keyboard.
- Closed, the rail is a thin track that does not take layout space from the middle view.
- Docs load lazily as the user scrolls, so the list scales past what fits at once.
- Colour marks hover, focus, and selection so the eye tracks movement through the list.

## Non-Goals

- The ZapRail does not edit docs; it loads them into the editor.
- The ZapRail does not change the middle view; only chords change views.
- The ZapRail does not own the doc's persistence; the editor persists the loaded doc.
- The ZapRail does not define the doc tree's on-disk source or its paging API; it consumes them. A later spec defines the source.
- The ZapRail does not present a scrollbar as a visible control.

## Product Requirements

### Layout

- The ZapRail MUST occupy the left column of the workspace, from the navbar down to the bottom edge.
- The open rail MUST keep padding between its right edge and the middle view.
- The rail MUST NOT show a visible scrollbar; overflow scrolls without scrollbar chrome.
- At or above the `rail` breakpoint, the open rail MUST sit in the layout grid (`grid-area: zap`).
- Below the `rail` breakpoint, the rail MUST leave the grid, fix to the left edge, and slide in over the middle view.

### Open and Close

- The drawer chord (`Alt+Shift+ArrowLeft`) MUST open the rail from any view.
- The drawer chord MUST close an open rail.
- When the rail closes, context-reel MUST return focus to the middle view.
- The open rail MUST show a close control (`×`) at the right of its header.
- Activating the close control MUST close the rail and return focus to the middle view.
- The closed rail MUST render as a thin vertical track on the left edge, not a full panel.
- The closed rail MUST stay reachable, so the drawer chord can reopen it.

### Focus and Keyboard Navigation

- When the drawer chord opens the rail, context-reel MUST move focus into the rail.
- On open, focus MUST land on a doc (the landed doc), so the next keystroke acts on a doc.
- While the rail holds focus, `Tab` MUST move the landed doc down to the next doc and `Shift+Tab` up to the previous doc — the canonical up/down navigation of a list.
- While the rail holds focus, `Enter` MUST load the landed doc.
- So `Alt+Shift+ArrowLeft` then `Enter` MUST open the rail and load the doc focus lands on, with no mouse.
- Navigation MUST keep the landed doc in view, scrolling the list when focus reaches an edge.

### Doc Loading

- Loading a doc MUST hand its text to the editor channel (`context-reel:to-editor`); it MUST NOT change the view.
- After a load, the editor MUST persist the doc, and the open view (editor or mind map) MUST render from it.
- Loading a doc from a click MUST behave the same as loading it with `Enter`.
- After a load on the slide-in (small-screen) rail, context-reel SHOULD close the rail; on the docked rail it SHOULD stay open.

### Infinite Scroll and Disk Loading

- The doc list MUST load docs from disk, not only the fixed sample set.
- The doc list MUST load more docs as the user scrolls toward the bottom (infinite scroll).
- The rail MUST group docs by their source path.
- The rail SHOULD load only what the user has scrolled to, so a large tree does not load at once.

### Selection and Visual State

- Each doc row MUST show a distinct hover state.
- The rail MUST mark the selected doc with a distinct selected state.
- The landed doc MUST show a visible focus state, distinct from hover and selection.
- Colour MUST serve movement and navigation: hover, focus, and selection each read at a glance.

### Accessibility

- The rail MUST expose an accessible name (today: "Doc drawer").
- Each doc row MUST be a real button, reachable and operable from the keyboard.
- The close control MUST have an accessible name.
- Focus order MUST follow the visible doc order.

### Security

- The ZapRail inherits the parent spec's markdown trust boundary: a loaded doc is untrusted markdown, sanitized by the editor and renderers before display. The rail MUST NOT inject doc text as raw HTML.

## Proposed Design

The ZapRail is an `aside` in the workspace grid at `grid-area: zap`. Open, it is a column: a header with the "Docs" title and a close `×`, a scrollable doc list, and a footer hint naming the drawer chord.

The rail reads `workspace.drawerOpen`. At or above the `rail` breakpoint the rail is docked in the grid. Below it, the rail leaves the grid, fixes to the left edge, and slides in when `drawerOpen` is true.

The closed form is a thin vertical track on the left edge — a rail line — that the drawer chord reopens.

The doc list renders the doc tree from disk, grouped by source path, and pages in more rows as the user scrolls toward the bottom. The list scrolls without a visible scrollbar.

Keyboard flow: the drawer chord opens the rail and moves focus to a doc. `Tab` and `Shift+Tab` move the landed doc; `Enter` loads it; the drawer chord closes the rail and returns focus to the middle view.

Loading a doc dispatches `context-reel:to-editor` with the doc text. The editor persists it and the open view renders it; the view itself does not change. Only chords change views.

## Acceptance Criteria

### Open and focus

```gherkin
Given the user is in any view
When the user presses Alt+Shift+ArrowLeft
Then context-reel opens the ZapRail
And moves focus to a doc in the rail
```

### Open then load with the keyboard

```gherkin
Given the ZapRail is closed
When the user presses Alt+Shift+ArrowLeft and then Enter
Then context-reel loads the doc focus landed on
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
Then context-reel closes the rail
And returns focus to the middle view
```

### Closed thin rail

```gherkin
Given the ZapRail is closed
Then context-reel shows a thin vertical track on the left edge
And the drawer chord reopens the full rail
```

### Infinite scroll from disk

```gherkin
Given the doc list is longer than the viewport
When the user scrolls toward the bottom
Then context-reel loads more docs from disk
And shows no scrollbar
```

### Load hands off to the editor

```gherkin
Given a doc is focused or clicked
When the user loads it
Then context-reel dispatches the doc text on context-reel:to-editor
And the editor persists it and the open view renders it
```

### Hover, focus, and selection

```gherkin
Given the doc list is visible
When the user hovers a doc
Then it shows a hover state
And the most recently loaded doc shows a selected state
And the focused doc shows a focus state distinct from both
```

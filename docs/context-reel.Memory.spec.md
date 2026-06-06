# context-reel Memory Spec

Browse the memory. Add to it. Never hold the secret.

## Status

Draft.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
in this document are to be interpreted as described in
RFC 2119 and RFC 8174 when, and only when, they appear in
all capitals.

## Document Type

This is a design doc.

It pins one feature: a view that browses and adds agent
memories. It is one new view, one read-and-write seam to
the memory data plane, and one secret boundary. The secret
boundary makes it more than an ADR. It is not contractual,
so it is not an SRS.

## Context

Agents record memories so a later session starts warm. A
memory is one sentence over a controlled vocabulary: an
entity, a relation, a target entity, a work domain, and the
notes that complete the sentence. The store is the memory
data plane: a Supabase table with hybrid full-text and
vector search, written through a `new_memory` call and read
through search and listing calls.

The feature exists working as a prototype in a sibling
example project, EdgeGrammar, as the Node files `web.js`,
`web.html.js`, and `index.js`. That prototype is the
reference for the interaction model: an entity-tabbed feed,
a new-memory form over the vocabularies, a relation graph,
saved view states, and a raw-JSON peek.

The prototype is the reference, not the target. It is a
Node server that read JSONL files straight off the local
disk and held a provider key in process. Those JavaScript
server files were later removed from EdgeGrammar as a
security remediation. context-reel re-platforms the
interaction onto its own stack: SvelteKit routes as the
seam, the Supabase memory plane as the store, and the same
secret boundary the rest of context-reel already keeps. The
browser never holds a provider key or a service-role key.

## Vocabulary

**Memory** is one recorded sentence: entity, relation,
target entity, work, and notes.

**Entity** is the actor, such as Claude or the Architect.

**Relation** is the verb that joins the entity to the
target.

**Work** is the domain the memory belongs to.

**Notes** is the body that completes the sentence.

**Edge** is the relation, target entity, and work carried
with a memory.

**Vocabulary** is a controlled set: the allowed entities,
relations, and works. The server rejects a value outside
its set.

**Feed** is the list of memories shown for the selected
entities.

**Graph** is the relation graph drawn from the feed's
edges.

## What The Reference Does

Read from the prototype so the carry-over is concrete.

- A row of entity tabs picks whose memories show. A click
  selects one entity; a modified click adds or removes one,
  so several entities can show at once. A Collab tab shows
  the collaboration edges.
- The feed fetches memories for the selected entities,
  dedupes by id, sorts newest first, and caps at a limit
  the user sets. A relation filter narrows the fetch.
- Each memory is a card, collapsed by default: a date, the
  sentence of entity, relation, target, and work, and the
  notes. A control reveals the raw record. A toggle hides
  the whole feed.
- A new-memory form holds four selects over the
  vocabularies, a Collab flag, a notes editor, and Save. It
  posts the memory and the feed refreshes.
- A graph toggle draws the entities on a circle with
  directed edges for their relations. Hover or click an
  entity to highlight its edges; click the background to
  clear. The graph is derived at runtime from the fetched
  edges; nothing is hardcoded.
- A sidebar holds named saved view states. The current view
  state also restores on reload.
- Keyboard shortcuts focus the notes, toggle the graph,
  hide the feed, and save.

The prototype also embedded a provider chat that wrote a
memory per turn. That is out of scope here; context-reel
already owns chat.

## Goals

- A user can browse memories by entity, newest first.
- A user can narrow the feed by relation and cap its size.
- A user can read any memory's full notes and its raw
  record.
- A user can add a memory over the controlled vocabularies
  in one view.
- A user can see the relation graph drawn from the memories
  on screen.
- No provider key and no service-role key ever reach the
  browser.
- One concept has one name across the UI, code, and tests.

## Non-Goals

- The Memory view does not embed a chat. context-reel's
  chat is its own view.
- The Memory view does not write a memory per chat turn.
- The Memory view does not read memories from local files.
  The store is the Supabase memory plane.
- The Memory view does not hold a provider key, a
  service-role key, or any secret value.
- The Memory view does not define the vocabularies. They
  are the data plane's, and the server is their authority.
- The Memory view does not build a feed row from an HTML
  string.

## Proposed Design

**The view.** A new Svelte component, `Memory.svelte`,
joins the workspace beside the editor, chat, and config. It
mounts once and is shown or hidden by `workspace.view`, so
a view swap never reloads the page.

**The seam.** SvelteKit routes under `/api/memory` are the
only path to the store. A read route lists memories for the
selected entities; a write route records a new memory. The
routes hold the publishable key and the agent identity in
the server environment and call the memory data plane's
list and `new_memory` operations. The browser calls the
routes; it never calls the data plane directly and never
holds a key.

**The feed.** Entity tabs drive a fetch through the read
route. The result is deduped by id, sorted newest first,
and capped at the user's limit. A relation filter narrows
the request. Rows render from data through Svelte markup,
never from HTML strings.

**The form.** Four selects mirror the entity, work, target
entity, and relation vocabularies, plus a Collab flag and a
notes editor. context-reel's editor library,
markdown-text-editor, is the notes editor, so the app keeps
one editor. Save posts through the write route; on success
the feed refreshes.

**The graph.** A toggle draws an SVG relation graph: the
entities on a circle, directed edges for their relations,
hover and click to highlight an entity's edges. The graph
data is derived at runtime from the fetched edges.

**View state.** The selected entities, the limit, the
relation filter, and the graph toggle persist as client
state so the view restores across a reload, consistent with
how the workspace keeps its other state.

**Chords.** Memory actions register in the chord registry
as `Alt+Shift+<key>` commands, command identity apart from
the key, like every other context-reel shortcut.

## Requirements

Each requirement is one shape, one capability. If a test
cannot mark it pass or fail, it is not here.

### The secret boundary

- The Memory view MUST read and write memories only through
  a server route.
- The server route MUST hold the publishable key and the
  agent identity in the server environment.
- The Memory view MUST NOT hold a provider key or a
  service-role key.
- The Memory view MUST NOT display or log a key.

### The feed

- The Memory view MUST list memories for the selected
  entities.
- The Memory view MUST let the user select one entity.
- The Memory view MUST let the user select several entities
  at once.
- The Memory view MUST sort the feed newest first.
- The Memory view MUST remove duplicate memories from the
  feed by id.
- The Memory view MUST cap the feed at the user's limit.
- When the user sets a relation filter, the Memory view
  MUST narrow the feed to that relation.
- The Memory view MUST show each memory's entity, relation,
  target entity, work, and notes.
- The Memory view MUST let the user reveal a memory's raw
  record.

### The form

- The Memory view MUST offer the entity, work, target
  entity, and relation values as selects over the
  controlled vocabularies.
- When the user saves a memory, the Memory view MUST post
  it through the write route.
- If the server rejects a value outside a vocabulary, then
  the Memory view MUST show the error and MUST NOT clear
  the form.
- When a save succeeds, the Memory view MUST refresh the
  feed.

### The graph

- When the user toggles the graph on, the Memory view MUST
  draw the entities and their relation edges.
- The Memory view MUST derive the graph from the fetched
  edges, not from a hardcoded set.
- When the user highlights an entity, the Memory view MUST
  emphasize that entity's edges.

### Should and may

- The feed SHOULD restore its selected entities, limit, and
  filter across a reload.
- The Memory view MAY let the user save and restore named
  view states.
- The Memory view MAY offer a search over the memory plane's
  full-text and vector index.

# 🎞️ context-reel memory spec

> A WebUI for the Memory data store.
> This will piggy back off of the editor and chat views, exposing the memory functions to the UI.

This is a design doc for one feature.
This is for a view that browses and adds agent memories.

---

## <span style="color:#ffaa24">🧭 Contents</span>

- Status
- Document Type
- Context
- Vocabulary
- What The Reference Does
- Goals
- Non-Goals
- Proposed Design
- Requirements

---

## <span style="color:#ffaa24">🔖 Status</span>

Draft.

> MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
> carry their RFC 2119 and RFC 8174 meaning.
> Only when they appear in all capitals.

---

## <span style="color:#ffaa24">📐 Document Type</span>

This is a design doc.

It pins one feature.

A view that browses and adds agent memories.

The feature is three things.

- One new view.
- One read-and-write seam to the memory data plane.
- One secret boundary.

The secret boundary makes it more than an ADR.

It sets no contract.

So it is not an SRS.

---

## <span style="color:#ffaa24">🧠 Context</span>

Agents record memories.

A later session starts warm.

A memory is one sentence over a controlled vocabulary.

- An entity.
- A relation.
- A target entity.
- A work domain.
- The notes that complete the sentence.

The store is the memory data plane.

A Supabase table with hybrid full-text and vector search.

- You write through a `new_memory` call.
- You read through search and listing calls.

### <span style="color: #D2A8FF">The reference prototype</span>

The feature already runs as a prototype.

It lives in a sibling project, EdgeGrammar.

Three Node files carry it.

- `web.js`
- `web.html.js`
- `index.js`

That prototype is the reference for the interaction model.

- An entity-tabbed feed.
- A new-memory form over the vocabularies.
- A relation graph.
- Saved view states.
- A raw-JSON peek.

The prototype is the reference, not the target.

It was a Node server.

- It read JSONL files straight off local disk.
- It held a provider key in process.

Those server files were later removed from EdgeGrammar.

The removal was a security fix.

context-reel re-platforms the interaction onto its own stack.

- SvelteKit routes as the seam.
- The Supabase memory plane as the store.
- The same secret boundary context-reel already keeps.

The browser never holds a provider key.

The browser never holds a service-role key.

---

## <span style="color: #ffaa24">📖 Vocabulary</span>

**Memory**
One recorded sentence: entity, relation, target, work, notes.

**Entity**
The actor, such as Claude or the Architect.

**Relation**
The verb that joins the entity to the target.

**Work**
The domain the memory belongs to.

**Notes**
The body that completes the sentence.

**Edge**
The relation, target entity, and work carried with a memory.

**Vocabulary**
A controlled set of allowed entities, relations, and works.
The server rejects any value outside its set.

**Feed**
The list of memories shown for the selected entities.

**Graph**
The relation graph drawn from the feed's edges.

---

## <span style="color:#ffaa24">🪞 What The Reference Does</span>

> Read from the prototype.
> Keep the carry-over concrete.

### <span style="color: #D2A8FF">Entity tabs</span>

- A click selects one entity.
- A modified click adds or removes one.
- Several entities can show at once.
- A Collab tab shows the collaboration edges.

### <span style="color: #D2A8FF">The feed</span>

- Fetches memories for the selected entities.
- Dedupes by id.
- Sorts newest first.
- Caps at a limit the user sets.
- A relation filter narrows the fetch.

### <span style="color: #D2A8FF">Each memory</span>

- A card, collapsed by default.
- Shows the date.
- Shows the sentence of entity, relation, target, and work.
- Shows the notes.
- A control reveals the raw record.
- A toggle hides the whole feed.

### <span style="color: #D2A8FF">The form</span>

- Four selects over the vocabularies.
- A Collab flag.
- A notes editor.
- A Save action.
- It posts the memory, then the feed refreshes.

### <span style="color: #D2A8FF">The graph</span>

- Draws the entities on a circle.
- Directed edges show their relations.
- Hover or click an entity to highlight its edges.
- Click the background to clear.
- Derived at runtime from the fetched edges.
- Nothing is hardcoded.

### <span style="color: #D2A8FF">The sidebar</span>

- Holds named saved view states.
- The current view state restores on reload.

### <span style="color: #D2A8FF">Shortcuts</span>

- Focus the notes.
- Toggle the graph.
- Hide the feed.
- Save.

The prototype also embedded a provider chat.

It wrote a memory per turn.

That is out of scope here.

context-reel already owns chat.

---

## <span style="color:#4ade80">🎯 Goals</span>

- Browse memories by entity, newest first.
- Narrow the feed by relation and cap its size.
- Read any memory's full notes and its raw record.
- Add a memory over the controlled vocabularies in one view.
- See the relation graph drawn from the memories on screen.
- No provider key ever reaches the browser.
- No service-role key ever reaches the browser.
- One concept has one name across UI, code, and tests.

---

## <span style="color: #D2A8FF">🚫 Non-Goals</span>

- The Memory view does not embed a chat.
- The chat is its own view.
- The Memory view does not write a memory per chat turn.
- The Memory view does not read memories from local files.
- The store is the Supabase memory plane.
- The Memory view does not hold a provider key.
- The Memory view does not hold a service-role key.
- The Memory view does not hold any secret value.
- The Memory view does not define the vocabularies.
- The data plane owns them; the server is their authority.
- The Memory view does not build a feed row from HTML.

---

## <span style="color:#ffaa24">🏗️ Proposed Design</span>

### <span style="color: #D2A8FF">The view</span>

- A new Svelte component, `Memory.svelte`.
- Joins the workspace beside editor, chat, and config.
- Mounts once.
- `workspace.view` shows or hides it.
- A view swap never reloads the page.

### <span style="color: #D2A8FF">The seam</span>

- SvelteKit routes under `/api/memory` are the only path.
- A read route lists memories for the selected entities.
- A write route records a new memory.
- The routes hold the publishable key in the server.
- The routes hold the agent identity in the server.
- They call the data plane's list and `new_memory` calls.
- The browser calls the routes, never the data plane.
- The browser never holds a key.

### <span style="color: #D2A8FF">The feed</span>

- Entity tabs drive a fetch through the read route.
- The result is deduped by id.
- The result is sorted newest first.
- The result is capped at the user's limit.
- A relation filter narrows the request.
- Rows render from data through Svelte markup.
- Rows never render from HTML strings.

### <span style="color: #D2A8FF">The form</span>

- Four selects mirror entity, work, target, and relation.
- Plus a Collab flag and a notes editor.
- The notes editor is markdown-text-editor.
- The app keeps one editor.
- Save posts through the write route.
- On success the feed refreshes.

### <span style="color: #D2A8FF">The graph</span>

- A toggle draws an SVG relation graph.
- The entities sit on a circle.
- Directed edges show their relations.
- Hover and click highlight an entity's edges.
- The data is derived at runtime from the edges.

### <span style="color: #D2A8FF">View state</span>

- Selected entities, limit, filter, and graph toggle persist.
- They persist as client state.
- The view restores across a reload.
- This matches how the workspace keeps its other state.

### <span style="color: #D2A8FF">Chords</span>

- Memory actions register in the chord registry.
- Each is an `Alt+Shift+<key>` command.
- Command identity stays apart from the key.
- This matches every other context-reel shortcut.

---

## <span style="color:#ffaa24">✅ Requirements</span>

> Each requirement is one shape, one capability.
> If a test cannot mark it pass or fail, it is not here.

### <span style="color: #D2A8FF">The secret boundary</span>

- The Memory view MUST read and write only through a route.
- The route MUST hold the publishable key in the server.
- The route MUST hold the agent identity in the server.
- The Memory view MUST NOT hold a provider key.
- The Memory view MUST NOT hold a service-role key.
- The Memory view MUST NOT display or log a key.

### <span style="color: #D2A8FF">The feed</span>

- The Memory view MUST list memories for the selected entities.
- The Memory view MUST let the user select one entity.
- The Memory view MUST let the user select several entities.
- The Memory view MUST sort the feed newest first.
- The Memory view MUST remove duplicate memories by id.
- The Memory view MUST cap the feed at the user's limit.
- On a relation filter, the Memory view MUST narrow the feed.
- The Memory view MUST show entity, relation, target, work, notes.
- The Memory view MUST let the user reveal the raw record.

### <span style="color: #D2A8FF">The form</span>

- The Memory view MUST offer entity, work, target, and relation as selects over the vocabularies.
- On save, the Memory view MUST post through the write route.
- On a rejected value, the Memory view MUST show the error.
- On that rejection, the Memory view MUST NOT clear the form.
- On a successful save, the Memory view MUST refresh the feed.

### <span style="color: #D2A8FF">The graph</span>

- On graph toggle, the Memory view MUST draw the entities and their relation edges.
- The Memory view MUST derive the graph from the fetched edges, not a hardcoded set.
- On highlight, the Memory view MUST emphasize that entity's edges.

### <span style="color:#4ade80">Should and may</span>

- The feed SHOULD restore its entities, limit, and filter across a reload.
- The Memory view MAY let the user save and restore named view states.
- The Memory view MAY offer a search over the full-text and vector index.

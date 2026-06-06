# context-reel Spec

_N_ Models, 1 History.

## Status

Draft.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

## Document Type

This is a design doc. It defines the product contract for context-reel.

context-reel is not safety-critical or contractual enough for an SRS. It is not a single decision, so it is not an ADR. The ambiguity is product shape, vocabulary, interaction model, and trust boundary.

## Context

context-reel is a chat workspace where multiple frontier models share one history.

The chat is the product center. The editor, config roster, document rail, and shortcut rail support the same shared history. The editor exists first to consume model markdown output, let the user revise it, and send edited markdown back into chat. It exists second as a WYSIWYG markdown editor. Config exists only to configure the models available to chat. Keyboard shortcuts make the workflow faster.

The re-platform moved the application onto a new stack. The new stack is acceptable only if it keeps this product contract.

## Vocabulary

**context-reel** is the application.

**Chat** is the primary workspace where the user messages configured models.

**History** is the shared chat record. Every configured model receives the same history when it answers.

**Editor** is the markdown handoff surface for model output. It can also be used as a WYSIWYG markdown editor.

**Config** is the support surface for configuring the models available to chat.

**Provider** is the company or service that offers models, such as OpenAI, Anthropic, Google, or xAI.

**Model** is one model offered by a provider, such as GPT 5.5 or Claude Sonnet.

**Configured model** is a saved roster entry. It names a provider, one model from that provider, a display name, and the environment variable that holds the provider key.

**Selected model** is the configured model selected for the next submitted message.

**Roster** is the list of configured models.

**Shortcut** is a keyboard command in context-reel.

## Goals

- One shared history contains turns from multiple frontier models.
- The selected model answers the next message.
- Every model receives the same history as context when it answers.
- Model markdown can move into the editor, change there, and return to chat.
- Config defines the models available to chat.
- Keyboard shortcuts move the workflow without the mouse.
- Provider API keys stay on the server.
- Tests drive the real application that ships.
- One concept has one name in the UI, code, tests, and documentation.

## Non-Goals

- context-reel does not define agents.
- context-reel does not define a lead model.
- context-reel does not define a primary model.
- context-reel does not define swarm orchestration.
- context-reel does not define model priority.
- context-reel does not treat the editor, config view, document rail, or shortcut rail as peer products to chat.
- context-reel does not treat standalone document editing as the editor's primary purpose.
- context-reel does not treat config as a standalone administration product.
- context-reel does not implement real provider SDK streaming in the first re-platform pass unless explicitly scoped.
- context-reel does not store provider API key values in browser storage.
- context-reel does not treat README prose as the product specification.

## Product Requirements

### Application

- context-reel MUST provide an editor view.
- context-reel MUST provide a chat view.
- context-reel MUST provide a config view.
- context-reel MUST provide a document rail.
- context-reel MUST provide a shortcut rail or shortcut reference.
- context-reel MUST treat chat as the primary workspace.
- context-reel MUST treat editor, config, document rail, and shortcut rail as support surfaces for chat.
- When the user changes views, context-reel MUST preserve editor text, chat history, and roster state.
- When the user changes views, context-reel MUST NOT reload the page.

### Chat

- context-reel MUST maintain one shared history for the chat.
- context-reel MUST allow the user to message multiple configured frontier models in the same history.
- context-reel MUST send each submitted message to the selected model.
- context-reel MUST send the full history with each chat request.
- context-reel MUST NOT depend on server-held chat session state between requests.
- If no model is selected, then context-reel MUST prevent message submission.
- When the user submits a message, context-reel MUST append the user message to the history immediately.
- When context-reel begins a response, context-reel MUST show that response as streaming before the first token arrives.
- While a response is streaming, context-reel MUST provide a stop control.
- When the user stops a response, context-reel MUST preserve the partial response.
- When a stream fails, context-reel MUST show an error state on the affected response.
- When a stream fails, context-reel SHOULD provide retry.
- context-reel MUST NOT silently switch models during a retry.
- If context-reel supports reroute, then reroute MUST explicitly name the new selected model before resubmission.

### Models

- Config MUST exist only to configure models for chat.
- Config MUST let the user configure the models available in chat.
- Config MUST let the user configure each model used in chat.
- Config MUST let the user configure the provider key environment variable name used by each configured model.
- Config MUST NOT expose settings that do not affect chat behavior unless a later spec adds another product surface.
- Config MUST NOT store provider API key values.
- context-reel MUST display configured models in the roster.
- Each configured model MUST have one display name.
- Each configured model MUST name one provider.
- Each configured model MUST name one provider model.
- Each configured model MUST store the name of the provider API key environment variable.
- Each configured model MUST NOT store the provider API key value in browser storage.
- context-reel MUST use the term "selected model" for the configured model selected by the user.
- context-reel MUST NOT use agent, lead, active, primary, owner, captain, orchestrator, or target as synonyms for selected model.
- When the user selects a model, context-reel MUST mark that model as the selected model.
- When the user selects a model, context-reel MUST NOT imply leadership, priority, orchestration, or ownership.
- When the user changes a configured model's provider, context-reel MUST keep provider, model, environment variable name, and displayed provider metadata coherent.
- If context-reel cannot keep provider, model, and environment variable name coherent after an edit, then context-reel MUST reject the edit with a visible error.
- Codex MUST NOT be modeled as a provider or model.
- GPT 5.5 MUST be modeled as a model.
- context-reel MUST NOT invent model hierarchy unless a later spec defines orchestration.
- The roster MUST support more than one configured frontier model in the same chat workspace.

### Editor

- The editor MUST consume markdown output produced by models.
- The editor MUST allow the user to edit consumed markdown output.
- The editor MUST allow the user to send edited markdown back into the chat.
- The editor MUST provide WYSIWYG markdown editing.
- The editor MUST support normal WYSIWYG markdown editing features, including links and images.
- context-reel MUST treat WYSIWYG markdown editing as secondary to model-output handoff.
- When the user sends editor content to chat, context-reel MUST preserve the markdown text as the message content.

### Shortcuts

- context-reel MUST define workspace shortcuts in one registry.
- context-reel MUST expose the shortcut registry to the UI.
- context-reel MUST expose the shortcut registry through a testable route or module boundary.
- When the user presses the editor shortcut, context-reel MUST show the editor view.
- When the user presses the chat shortcut, context-reel MUST show the chat view.
- When the user presses the config shortcut, context-reel MUST show the config view.
- If the user presses an unbound shortcut, then context-reel MUST leave the current workspace state unchanged.

### Streaming

- context-reel MUST stream response events incrementally.
- context-reel MUST represent token events distinctly from done events and error events.
- If provider streaming is not implemented for a selected model, then context-reel MUST fail visibly.

### Secrets

- context-reel MUST read provider API key values only on the server.
- context-reel MUST allow the browser to store provider API key environment variable names.
- context-reel MUST NOT send provider API key values to the browser.
- context-reel MUST NOT write provider API key values to IndexedDB, localStorage, sessionStorage, or history.
- When probing provider reachability, context-reel MUST return a status without returning the key value.
- When an environment variable is missing, context-reel MUST show an error that names the missing environment variable.

### Markdown Rendering

- context-reel MAY render markdown in editor preview and chat responses.
- context-reel MUST NOT inject unsanitized raw HTML from user text or model output into the DOM.
- If context-reel uses Svelte {@html}, then context-reel MUST sanitize or escape the rendered HTML before injection.
- context-reel MUST reject or neutralize unsafe URL schemes in rendered links and images.
- context-reel MUST treat model output as untrusted content.

### Persistence

- context-reel MUST persist roster configuration locally.
- context-reel MUST persist the history locally unless the user clears it.
- context-reel MUST visibly tell the user that chat history is saved in the browser.
- context-reel MUST provide a visible control to clear saved chat history.
- context-reel MAY persist editor text locally.
- context-reel MUST NOT persist provider API key values locally.
- context-reel MUST preserve local state across view changes.

### Documentation

- context-reel documentation MUST use the vocabulary in this spec.
- context-reel documentation MUST NOT describe agents, lead models, active models, or primary models.
- context-reel documentation MUST distinguish provider, model, configured model, and selected model.
- context-reel documentation MUST link to source files rather than paste large source snapshots.

### Tests

- context-reel tests MUST drive the real browser application.
- context-reel tests MUST exercise the real editor artifact.
- context-reel tests MUST exercise the real roster UI controls.
- context-reel tests MUST exercise the real streaming route.
- context-reel tests MUST fail if code, UI, or documentation introduces agent or lead-model vocabulary.
- context-reel tests MUST fail if rendered markdown executes raw HTML or unsafe link schemes.
- context-reel tests MUST fail if provider key values appear in browser storage or response bodies.

## Proposed Design

context-reel keeps three top-level work areas mounted: editor, chat, and config. View changes hide and show areas without destroying their state.

Chat is the center of context-reel. Editor, config, document rail, and shortcut rail are downstream support surfaces. They exist to prepare, route, configure, and accelerate one chat with multiple frontier models.

The editor is primarily a model-output markdown workbench. A model response can move into the editor, the user can reshape it, and the edited markdown can move back into the same chat. Its WYSIWYG editing behavior supports that loop; it is not the primary product by itself.

Config is model setup for chat. It defines which configured models exist, which provider and model each one uses, and which server environment variable supplies that provider's key. It has no independent workflow outside making chat work.

The roster owns model configuration. Chat reads the roster and uses the selected model for the next submitted message.

The selected model is UI state. It is not a hierarchy. It is not an orchestration role. It is not authority. It is just the model that receives the next message.

The server receives a complete history with each chat request. It streams events back as token, done, or error records. The server does not remember chat state between requests.

The browser stores environment variable names. The server reads environment variable values. Key values never cross into browser-visible state.

Markdown rendering is a trust boundary. Markdown output must be sanitized or escaped before any Svelte {@html} injection.

## Cross-Cutting Concerns

### Security

Provider API key values are secrets. They stay server-side.

Model output is untrusted. It must not become executable DOM.

Markdown rendering is a security boundary.

### Privacy

The history is local user data. context-reel should not transmit history data except as part of an explicit chat request.

### Observability

Streaming failures must be visible to the user. Silent failure is not acceptable.

### Accessibility

Roster controls must have stable accessible names. Tests should use user-facing controls where possible.

## Acceptance Criteria

### Selected Model

```gherkin
Given the roster contains multiple configured models
When the user selects one model
Then context-reel marks that model as the selected model
And context-reel does not label the model as agent, lead, active, primary, or owner
```

```gherkin
Given a model is selected
When the user submits a message
Then context-reel sends the message to the selected model
```

### Multiple Frontier Models

```gherkin
Given the roster contains configured models from different providers
When the user selects different models across turns
Then context-reel records those turns in the same history
And each model response identifies the model that produced it
```

### Editor Markdown Handoff

```gherkin
Given a model response contains markdown
When the user sends that response to the editor
Then the editor opens the response as editable markdown
```

```gherkin
Given the editor contains markdown
When the user sends the editor content to chat
Then context-reel submits the markdown text as a message in the same chat
```

### Vocabulary

```gherkin
Given the context-reel codebase, tests, and documentation
When reviewer searches for invalid model vocabulary
Then no UI label, test name, code symbol, or documentation sentence uses agent, lead, active, primary, owner, captain, orchestrator, or target as a synonym for selected model
```

### Provider And Model

```gherkin
Given a configured model uses OpenAI with GPT 5.5
When the roster displays the configured model
Then OpenAI is shown as the provider
And GPT 5.5 is shown as the model
```

### Secret Boundary

```gherkin
Given a configured model uses OPENAI_API_KEY
When context-reel stores the roster in the browser
Then the browser storage contains OPENAI_API_KEY
And the browser storage does not contain the API key value
```

### Markdown Boundary

```gherkin
Given model output contains raw HTML with script behavior
When context-reel renders the message
Then the raw HTML does not execute
And the rendered DOM contains no executable script from that output
```

```gherkin
Given model output contains a javascript link
When context-reel renders the message
Then the link is removed or neutralized
```

```gherkin
Given markdown contains an image
When context-reel renders the markdown
Then the image renders only if its URL scheme is safe
```

### Stateless Streaming

```gherkin
Given chat history exists in the browser
When the user submits a message
Then context-reel posts the history with the request
And the server response streams token events before the done event
```

### Saved History

```gherkin
Given context-reel saves chat history in the browser
When the user views the chat
Then context-reel tells the user that chat history is saved in the browser
And context-reel provides a visible control to clear saved chat history
```

### Re-Platform Gate

```gherkin
Given the context-reel re-platform
When the acceptance suite runs
Then it drives the real browser application
And it verifies editor, chat, config, shortcuts, streaming, persistence, and secret boundaries
```

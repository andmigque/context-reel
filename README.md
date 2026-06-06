# context-reel

_N_ Models, 1 History.

context-reel is a chat workspace where multiple frontier models share one history. 
Send a turn to Claude, GPT, Gemini, or Grok; the next selected model receives the same history. 
Send markdown back and forth from the chat to the wysiwyg editor.
Every action is available as a keyboard shortcut so your hands never have to touch a mouse.

## Quick Start

Install, copy the env file, and start the dev server.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

```text
  VITE v6.0.0  ready in 612 ms

  > Local:   http://localhost:5173/
  > Network: use --host to expose
  > press h + enter to show help
```

Open <http://localhost:5173>. The roster seeds itself on first run. Press `Alt+Shift+Right` for the shortcut sheet.

## Background

The chat is stateless by design. The whole history rides in the body of each `POST /api/chat`; the server keeps nothing between requests and streams tokens back as NDJSON, one event per line. The boundary is one function in [src/lib/chat/stream.ts](src/lib/chat/stream.ts).

The browser never stores provider key values. A roster row names the env var that holds a provider key, such as `ANTHROPIC_API_KEY`. The server reads the value from that name. The value never travels back to the browser. See the rule stated in [.env.example](.env.example) and enforced in [src/routes/api/probe/+server.ts](src/routes/api/probe/+server.ts).

The shortcut registry lives in [src/lib/chords/registry.ts](src/lib/chords/registry.ts). Command identity is held apart from the keys, so a rebind swaps the shortcut and leaves the command alone.

## Operational Checklist

### Shortcuts

Every binding is `Alt+Shift+<key>`. This table mirrors the in-app shortcut sheet; [registry.ts](src/lib/chords/registry.ts) is the source of truth if they ever disagree.

| Shortcut | Does |
| --- | --- |
| `Alt+Shift+E` | Jump to the editor |
| `Alt+Shift+C` | Jump to the chat |
| `Alt+Shift+K` | Jump to config |
| `Alt+Shift+Z` | Zap the editor selection into the chat |
| `Alt+Shift+R` | Toggle the rendered preview |
| `Alt+Shift+Left` | Open the doc drawer |
| `Alt+Shift+Right` | Show the shortcut sheet |
| `Alt+Shift+G` | Jump to git when that view exists |

### Configuration

The browser holds the env var name; the server holds the value. Fill in [.env](.env) with the keys you have.

| Variable | Holds the key for | Required |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude | When Claude goes live |
| `GOOGLE_API_KEY` | Gemini | When Gemini goes live |
| `OPENAI_API_KEY` | GPT | When GPT goes live |
| `XAI_API_KEY` | Grok | When Grok goes live |

### Provider Streaming

Provider streaming happens in [src/routes/api/chat/+server.ts](src/routes/api/chat/+server.ts). The route reads the provider key from its env var, calls the provider API, and relays each token as a `{ type: 'token' }` event. If provider streaming is not implemented for a selected model, the chat must show a visible error.

Provider probing happens in [src/routes/api/probe/+server.ts](src/routes/api/probe/+server.ts). The probe returns a verdict and never returns the key.

### Checks And Tests

```powershell
npm run check
npm run test:e2e
```

## Do Not Do

Do not put a provider key in the browser, in a roster row, or in any response body. The row names the env var; the server is the only thing that reads its value.

Do not use the `null` literal. The codebase uses `undefined` and explicit unions for absence, and `''` for an empty owned string. See [src/lib/types.ts](src/lib/types.ts).

Do not seed the roster from a template literal scattered through a component. The default roster is data in [src/lib/vendors/defaults.ts](src/lib/vendors/defaults.ts); the config store is its only writer.

Do not paste component source into this README. It is stale the moment it lands. Link to the source instead.

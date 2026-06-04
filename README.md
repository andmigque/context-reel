# 🎹 Cadence

> A keyboard-chorded workspace for streaming, stateless conversation with models.

Three views — an editor, a chat, a config roster — in one shell. You never reach for the mouse: every move is an `Alt+Shift+<key>` chord. The chat streams token by token, holds no server state, and never lets a vendor key touch the browser.

## 🚀 Quick Start

Install, copy the env file, and start the dev server.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

```
  VITE v6.0.0  ready in 612 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open <http://localhost:5173>. The roster seeds itself on first run, and the chat answers from a mock token stream straight away — no key required. Press `Alt+Shift+→` for the chord cheat sheet.

## 🔙 Background

Two costs make multi-agent work tedious: the hand leaving the keyboard, and the key leaving the machine.

Cadence answers the first with chords. The whole workspace — editor, chat, config — lives behind one `Alt+Shift+<key>` register, a band the browser and its devtools leave alone, so a workspace chord never collides with a claimed shortcut. The single source of truth for the set is [src/lib/chords/registry.ts](src/lib/chords/registry.ts); command identity is held apart from the keys, so a rebind swaps the chord and leaves the command alone.

It answers the second by never holding the key in the browser. A roster row names the **env var** that holds a vendor's key — `ANTHROPIC_API_KEY`, never the secret itself. The server reads the real value from that name and answers; the value never travels back. See the rule stated in [.env.example](.env.example) and enforced in [src/routes/api/probe/+server.ts](src/routes/api/probe/+server.ts).

The chat is stateless by design. The whole transcript rides in the body of each `POST /api/chat`; the server keeps nothing between requests and streams tokens back as NDJSON, one event per line. The seam is one function — transcript in, tokens out — in [src/lib/chat/stream.ts](src/lib/chat/stream.ts).

## ✅ Operational Checklist

### The chords

Every binding is `Alt+Shift+<key>`. This table mirrors the in-app cheat sheet; [registry.ts](src/lib/chords/registry.ts) is the source of truth if they ever disagree.

| Chord | Does |
| --- | --- |
| `Alt+Shift+E` | Jump to the editor |
| `Alt+Shift+C` | Jump to the chat |
| `Alt+Shift+K` | Jump to config |
| `Alt+Shift+Z` | Zap the editor selection into the chat |
| `Alt+Shift+R` | Toggle the rendered preview |
| `Alt+Shift+←` | Open the doc drawer |
| `Alt+Shift+→` | Show the chord cheat sheet |
| `Alt+Shift+G` | Jump to git (no view yet) |

### Configuration

The browser holds the env var **name**; the server holds the value. Fill in [.env](.env) with the keys you have.

| Variable | Holds the key for | Required |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude | When Claude goes live |
| `GOOGLE_API_KEY` | Gemini | When Gemini goes live |
| `OPENAI_API_KEY` | GPT | When GPT goes live |
| `XAI_API_KEY` | Grok | When Grok goes live |
| `CADENCE_MOCK_STREAM` | Toggles the synthetic stream. `true` (default) streams a mock answer and calls no vendor. Set `false` once a real backend is wired. | No |

### Wiring a real backend

Until a vendor is wired, the live path fails honestly rather than fake a stream. Two marked seams take the real call:

1. **Streaming** — the marked block in [src/routes/api/chat/+server.ts](src/routes/api/chat/+server.ts). Read the key from its env var, call the vendor SDK, relay each token as a `{ type: 'token' }` event.
2. **Probing** — the marked line in [src/routes/api/probe/+server.ts](src/routes/api/probe/+server.ts). Swap the present-key check for a cheap models call. Return the verdict; never return the key.

Then flip `CADENCE_MOCK_STREAM=false` and the same chat now streams the real answer.

### Checks and tests

```powershell
npm run check     # svelte-check against the project tsconfig
npm run test:e2e  # Playwright acceptance pass
```

## ❌ Do Not Do

Do not put a vendor key in the browser, in a roster row, or in any response body. The row names the env var; the server is the only thing that reads its value. The probe verdict travels back — the key never does.

Do not use the `null` literal. The spec floor, repeated across all four source documents, is `undefined` and explicit unions for absence, and `''` for an empty owned string. See the note at the top of [src/lib/types.ts](src/lib/types.ts).

Do not seed the roster from a template literal scattered through a component. The default roster is data in [src/lib/vendors/defaults.ts](src/lib/vendors/defaults.ts); the config store is its only writer.

## ❌❌ Definitely Don't Do This

Do not paste component source into this README. It is stale the moment you save. When a view changes, this file should still be true — because it links to the source instead of copying it. The chord set, the env rules, the stream shape: each lives in exactly one file, named above. Read the file, not a snapshot of it.

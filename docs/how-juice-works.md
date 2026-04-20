# How Juice works

Juice is a **desktop shell** around your existing Cubicles runtime.

## 1. Desktop shell

- **Tauri** provides the desktop window and native shell access.
- The shell plugin builds and starts a local Cubicles server process on app launch.
- In development, Juice always rebuilds the live Cubicles checkout before starting.
- In packaged builds, Cubicles is snapshotted into `src-tauri/resources/cubicles-runtime` at build time and launched from there.
- Backend target: `http://127.0.0.1:7799`

Platform-specific shell capabilities:
- `src-tauri/capabilities/default.json` — macOS / Linux (uses `/bin/zsh` + NVM)
- `src-tauri/capabilities/default-windows.json` — Windows (uses `cmd.exe` + `node` on PATH)

Key files: `src-tauri/src/lib.rs`, `scripts/`, `src/lib/tauri/cubicles-backend.ts`

For native installer output paths and packaging steps, see `docs/build-and-bundle.md`.

## 2. React UI

- **Vite + React** render the chat screen, settings, and sidebar.
- `ChatPanel` owns backend startup, session loading, history loading, and chat streaming.
- Transcript rendering is split: `transcript-helpers.ts` normalizes Cubicles history + SSE events into stable entries; `src/components/chat/` renders each entry type (messages, slash events, tool previews, tool cards, turn summaries, working shimmer).

### Advanced Mode

Toggle via the `BarChart2` button in the header (persisted in `localStorage`).

| Feature | Pure mode | Advanced mode |
|---------|-----------|---------------|
| CTX chip | Hidden | Live context usage % |
| Progress bar | Hidden | Header bottom bar (green→amber→red) |
| Turn summary cards | Hidden | Compact pill after each turn |

### Composer

- `/` — slash command autocomplete
- `@` — tool/skill/API reference autocomplete (`GET /api/tools/references`)

### Settings (8 tabs)

Overview · Profiles · **Working folder** · Memory · APIs · Extensions · Skills · Harness

The **Working folder** tab configures the on-disk directory Cubicles uses for the agent (tools, files, context). Juice persists the path in the browser (`juice:working-directory`) and passes `workspace_path` on session create, chat stream, and slash execution so Cubicles never falls back to implicit workspace IDs.

## 3. Cubicles runtime

Juice builds and launches the Cubicles server from `JUICE_CUBICLES_ROOT`, then uses its API as the sole runtime boundary. Cubicles owns sessions, profiles, per-session workspace paths, tools, approvals, slash commands, and model execution. The legacy workspace registry API is gone; workspace identity is the normalized absolute path.

## Startup flow

1. `ChatPanel` mounts → calls `ensureCubiclesBackend()`
2. Checks `http://127.0.0.1:7799/health`
3. If unhealthy: runs `build-cubicles-server.mjs` then `run-cubicles-server.mjs`
4. Once healthy: UI begins querying Cubicles APIs

## Runtime API surface

- `GET/PATCH /api/settings` (default profile only; no `default_workspace_id`)
- `GET/POST /api/profiles`
- `GET/POST/PATCH /api/sessions`, `GET /api/sessions/:id/history`, `POST /api/sessions/:id/activate` — create/patch use `workspace_path`
- `POST /api/chat/stream`, `GET /api/chat/pending/:sessionId` — chat body includes `workspace_path`
- `GET/POST /api/slash` — slash body includes `workspace_path`
- `GET /api/tools/references`
- `GET/POST/PUT/DELETE /api/apis`
- `GET/PUT /api/memory/documents/:identifier` (e.g. `memory` / MEMORY.md)
- `GET /api/tools` (catalog, extensions, references), `GET/POST /api/skills`, `POST /api/upload` (optional; `workspace_path` query)

Juice sets `CUBICLES_SKIP_TRUST_PROMPT=1` on the supervised Cubicles process so trust is not prompted on a non-interactive stdin; users can still manage trust with `cubicles trust` in a terminal.

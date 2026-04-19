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

Overview · Profiles · Workspaces · Memory · APIs · Extensions · Skills · Harness

## 3. Cubicles runtime

Juice builds and launches the Cubicles server from `JUICE_CUBICLES_ROOT`, then uses its API as the sole runtime boundary. Cubicles owns sessions, profiles, workspaces, tools, approvals, slash commands, and model execution.

## Startup flow

1. `ChatPanel` mounts → calls `ensureCubiclesBackend()`
2. Checks `http://127.0.0.1:7799/health`
3. If unhealthy: runs `build-cubicles-server.mjs` then `run-cubicles-server.mjs`
4. Once healthy: UI begins querying Cubicles APIs

## Runtime API surface

- `GET /api/settings`
- `GET/POST /api/profiles`
- `GET/POST /api/sessions`, `GET /api/sessions/:id/history`, `POST /api/sessions/:id/activate`
- `POST /api/chat/stream`, `GET /api/chat/pending/:sessionId`
- `GET/POST /api/slash`
- `GET /api/tools/references`
- `GET/POST/PUT/DELETE /api/workspaces`
- `GET/POST/PUT/DELETE /api/apis`
- `GET /api/memory`
- `GET/PUT /api/extensions`, `/api/skills`, `/api/harness`

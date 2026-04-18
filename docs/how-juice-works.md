# How Juice works

Juice is a **desktop shell** around your existing Cubicles runtime.

The app is split into three layers:

## 1. Desktop shell

- **Tauri** provides the desktop window and native shell access.
- The shell plugin is used to build and start a local Cubicles server process.
- The FS plugin is used for transcript export (saves Markdown files to the user's Downloads folder).
- In development, Juice always rebuilds and starts the live `cubicles-ts` checkout.
- In packaged builds, `tauri build` snapshots Cubicles into `src-tauri/resources/cubicles-runtime` using npm tarballs plus a production-only install, then launches that bundled runtime instead.
- Juice targets a dedicated local backend port:

```text
127.0.0.1:7799
```

Relevant files:

- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `scripts/package-cubicles-runtime.mjs`
- `scripts/build-cubicles-server.mjs`
- `scripts/run-cubicles-server.mjs`
- `src/lib/tauri/cubicles-backend.ts`

## 2. React UI

- **Vite + React** render the full-width chat screen, settings surfaces, and shadcn sidebar.
- `DesktopAssistant` owns the app-level flow for backend startup, session loading, history loading, and chat streaming.
- Layout uses a flat flex structure inside `SidebarInset`: `header` → scrollable transcript (`flex-1 overflow-y-auto`) → composer (`shrink-0`). This prevents rerender-induced width/height collapse.
- The composer shows slash-command autocomplete in a compact popup **above** the text area.
- Slash command/result pairs are kept inline in the transcript.
- The session sidebar supports create, select, search/filter, and delete flows.
- Session deletion goes through the shared slash dispatcher (`/sessions delete <id>`) so Juice follows the backend-selected active session after a delete.

### Transcript rendering

The transcript renders:
- user bubbles
- assistant markdown with Shiki syntax-highlighted code blocks
- slash command/result entries
- collapsible thinking sections — from live `<think>...</think>` blocks and from persisted `thinking` history rows
- `turn_summary` and `compressing` stream events (shown as system entries)
- tool and system entries with collapsible step indicators
- inline approval controls (approve, reject, redirect with note)

### Settings

Eight tabs — all create/edit forms use shadcn `Dialog`, not inline collapsibles:

| Tab | Contents |
|-----|----------|
| Overview | Backend health, connection test, logs, provider hints |
| Profiles | List with inline editor; Create profile dialog |
| Workspaces | List with inline editor; Register workspace dialog |
| Memory | MEMORY.md path |
| APIs | Description-only rows; Register API dialog; Edit API dialog (pencil button) |
| Extensions | Enable/default toggles |
| Skills | Enable/default toggles |
| Harness | Full harness config (budget, steps, reserve multipliers, prompt budget, etc.) |

Relevant files:

- `src/features/assistant/desktop-assistant.tsx`
- `src/components/chat/*`
- `src/components/sessions/*`
- `src/features/settings/settings-screen.tsx`
- `src/features/settings/profiles-tab.tsx`
- `src/features/settings/workspaces-tab.tsx`
- `src/features/settings/apis-tab.tsx`
- `src/features/settings/tools-tab.tsx` (Extensions, Skills, Harness)
- `src/components/ui/` (shadcn: sidebar, tabs, toggle, field, dialog, sonner)

## 3. Cubicles runtime

- Juice expects a separate Cubicles workspace at:

```text
/Users/goatcheese/Documents/repositories/cubicles-ts
```

- Juice builds that workspace, launches its server, and uses the server API as the runtime boundary.
- Cubicles remains the source of truth for sessions, profiles, workspaces, prompts, tools, approvals, slash commands, and model execution.

Relevant files:

- `scripts/build-cubicles-server.mjs`
- `scripts/run-cubicles-server.mjs`
- `src/lib/cubicles-api/client.ts`

## Startup flow

1. `DesktopAssistant` mounts.
2. It calls `ensureCubiclesBackend()`.
3. `ensureCubiclesBackend()` checks `http://127.0.0.1:7799/health`.
4. If no healthy backend is found, Juice runs:
   - `scripts/build-cubicles-server.mjs` (always rebuilds in dev)
   - `scripts/run-cubicles-server.mjs`
5. Once health succeeds, the UI starts querying Cubicles APIs.

## Runtime API surface

After backend startup, the UI uses:

- `GET /api/settings`
- `GET /api/profiles`
- `GET /api/sessions`
- `GET /api/sessions/:id/history`
- `POST /api/sessions`
- `POST /api/sessions/:id/activate`
- `POST /api/chat/stream`
- `GET /api/chat/pending/:sessionId`
- `GET /api/slash`
- `POST /api/slash`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `PUT /api/workspaces/:id`
- `DELETE /api/workspaces/:id`
- `GET /api/apis`
- `POST /api/apis`
- `PUT /api/apis/:name`
- `DELETE /api/apis/:name`
- `GET /api/memory`
- `GET /api/extensions`
- `GET /api/skills`
- `GET /api/harness`
- `PUT /api/harness`

## Why there is no `@cubicles/*` import in Juice

That is intentional.

Juice treats Cubicles as an **external runtime service**. That keeps the desktop app focused on windowing, local process supervision, UI state, API transport, and transcript rendering.

Cubicles handles session persistence, profiles, workspace resolution, tool execution, approval state, slash-command dispatch, and model/provider calls.


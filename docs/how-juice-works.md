# How Juice works

Juice is a **desktop shell** around your existing Cubicles runtime.

The app is split into three layers:

## 1. Desktop shell

- **Tauri** provides the desktop window and native shell access.
- The shell plugin is used to build and start a local Cubicles server process.
- In development, Juice starts the live `cubicles-ts` checkout.
- In packaged builds, `tauri build` snapshots Cubicles into `src-tauri/resources/cubicles-runtime` using npm tarballs plus a production-only install, then launches that bundled runtime instead.
- Juice currently targets a dedicated local backend port:

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
- The composer calls Cubicles slash endpoints directly, shows inline autocomplete, and keeps slash command/result pairs in the transcript instead of treating them as a separate mode.
- The session sidebar supports create, select, and delete flows against the real Cubicles API.
- Session deletion is routed through Cubicles' shared slash-command path (`/sessions delete <id>`) so Juice follows the backend-selected active session after a delete.
- The transcript renders:
  - user bubbles
  - assistant markdown replies
  - slash command/result entries
  - collapsible thinking sections — rendered from **closed** `<think>...</think>` blocks and from persisted `thinking` history rows returned by Cubicles
  - tool and system entries
  - inline approval actions for pending tools (approve, reject, redirect with note)
- Settings now includes workspace management alongside profiles, memory, APIs, extensions, and skills.
- Settings uses shadcn `Tabs` (top nav), `Toggle` for enable/default controls, `Field`/`FieldGroup` for create/edit forms, and `Sonner` toast for feedback.

Relevant files:

- `src/features/assistant/desktop-assistant.tsx`
- `src/components/chat/*`
- `src/components/sessions/*`
- `src/features/settings/settings-screen.tsx`
- `src/components/ui/` (shadcn: sidebar, tabs, toggle, field, label, sonner)

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
   - `scripts/build-cubicles-server.mjs`
   - `scripts/run-cubicles-server.mjs`
5. Once health succeeds, the UI starts querying Cubicles APIs.

## Runtime flow

After backend startup, the UI uses the local Cubicles API:

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

Juice uses `/api/slash` for inline slash execution, shared session deletion, and `/api/chat/pending/:sessionId` to restore pending approvals when reopening a live session.

## Why there is no `@cubicles/*` import in Juice

That is intentional in the current design.

Juice treats Cubicles as an **external runtime service**, not as a linked in-process library. That keeps the desktop app focused on:

- windowing
- local process supervision
- UI state
- API transport
- transcript rendering

Cubicles handles:

- session persistence
- profiles
- workspace resolution
- tool execution
- approval state
- slash-command dispatch
- model/provider calls

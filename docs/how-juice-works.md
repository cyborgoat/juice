# How Juice works

Juice is a **desktop shell** around your existing Cubicles runtime.

The app is split into three layers:

## 1. Desktop shell

- **Tauri** provides the desktop window and native shell access.
- The shell plugin is used to build and start a local Cubicles server process.
- Juice currently targets a dedicated local backend port:

```text
127.0.0.1:7799
```

Relevant files:

- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src/lib/tauri/cubicles-backend.ts`

## 2. React UI

- **Vite + React** render the chat screen and session drawer.
- `DesktopAssistant` owns the app-level flow for backend startup, session loading, history loading, and chat streaming.
- The transcript renders:
  - user bubbles
  - assistant markdown replies
  - embedded collapsible thinking sections
  - tool and system entries

Relevant files:

- `src/features/assistant/desktop-assistant.tsx`
- `src/components/chat/*`
- `src/components/sessions/*`

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

Cubicles also already exposes:

- `GET /api/slash`
- `POST /api/slash`

Those slash endpoints are not fully surfaced in Juice yet, but they are available in the backend and are part of the planned desktop roadmap.

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

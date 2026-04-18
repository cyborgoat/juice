# Juice

Desktop shell for a personal AI assistant built with **Tauri + Vite + React**, using your external **Cubicles** runtime as the backend.

## What Juice is

Juice is a desktop-first UI layer around Cubicles.

Today, Juice:

- launches a local Cubicles server from `/Users/goatcheese/Documents/repositories/cubicles-ts`
- checks backend health and shows connection state in the UI
- lists and activates real Cubicles sessions
- creates and deletes sessions from the desktop sidebar
- creates sessions through the Cubicles API
- streams chat responses from `/api/chat/stream`
- executes Cubicles slash commands through `GET/POST /api/slash`
- autocompletes slash commands, subcommands, sessions, and profiles directly in the composer
- rehydrates persisted session history from Cubicles by session ID
- renders assistant markdown with collapsible thinking sections from both live responses and persisted history
- renders slash command/result pairs inline in the transcript
- provides inline approve / reject / redirect controls for pending tool approvals
- uses a shadcn `Sidebar` with offcanvas collapse for session navigation and hover-only session actions
- multi-tab Settings page (Overview · Profiles · Memory · APIs · Extensions · Skills)
- workspace management in Settings (list, register, edit, set default, delete)
- profile create/edit/delete with shadcn `Field` forms and `Sonner` toast feedback
- memory file configuration (MEMORY.md path)
- API key registration and enable/disable via shadcn `Toggle`
- extension and skill enable/default toggles
- stable full-width chat layout with flat flex structure (no rerender-induced shrink)
- bundles a packaged Cubicles runtime snapshot for `tauri build`, while still using the live `cubicles-ts` checkout in development

Juice does **not** currently import `@cubicles/*` directly into the app bundle. It supervises Cubicles as a separate local process and talks to it over HTTP/SSE.

## Current architecture

Juice is split into three pieces:

1. **Tauri shell**
   - owns the desktop window
   - launches the Cubicles backend through the shell plugin
   - handles local process supervision
2. **React UI**
   - renders the sidebar, chat transcript, composer, and connection state
3. **Cubicles runtime**
   - remains the source of truth for sessions, profiles, workspaces, tools, skills, approvals, and model execution

More detail:

- [`docs/how-juice-works.md`](docs/how-juice-works.md)
- [`docs/cubicles-integration.md`](docs/cubicles-integration.md)
- [`todo.md`](todo.md)

## Local Cubicles dependency

Juice currently expects your Cubicles workspace at:

```text
/Users/goatcheese/Documents/repositories/cubicles-ts
```

The desktop backend bootstrap builds and runs the server from that workspace.

Current managed backend target:

```text
http://127.0.0.1:7799
```

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
npm run package:runtime
npm run tauri:dev
npm run tauri:build
```

## Native requirements

- Node.js
- Rust toolchain

## Current limitations

Juice is already using real Cubicles chat streaming, but several desktop surfaces are still missing:

- richer structured rendering for some slash and tool outputs
- more robust recovery for persisted pending approvals after reopening older sessions
- friendlier packaged-runtime diagnostics and recovery guidance

Those are tracked in [`todo.md`](todo.md).

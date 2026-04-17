# Juice

Desktop shell for a personal AI assistant built with **Tauri + Vite + React**, using your external **Cubicles** runtime as the backend.

## What Juice is

Juice is a desktop-first UI layer around Cubicles.

Today, Juice:

- launches a local Cubicles server from `/Users/goatcheese/Documents/repositories/cubicles-ts`
- checks backend health and shows connection state in the UI
- lists and activates real Cubicles sessions
- creates sessions through the Cubicles API
- streams chat responses from `/api/chat/stream`
- renders assistant markdown
- embeds collapsible thinking content inside assistant replies
- uses a compact drawer sidebar for session navigation

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
npm run tauri:dev
npm run tauri:build
```

## Native requirements

- Node.js
- Rust toolchain

## Current limitations

Juice is already using real Cubicles chat streaming, but several desktop surfaces are still missing:

- settings management UI, including profile CRUD and durable memory file editing
- slash command compatibility in the chat input
- slash command autocomplete
- approval controls in the desktop transcript/composer flow
- production packaging for the Cubicles runtime

Those are tracked in [`todo.md`](todo.md).

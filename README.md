# Juice

Desktop shell for a personal AI assistant built with **Tauri + Vite + React**, powered by your **Cubicles** runtime as the backend.

## What Juice does

- Streams chat via SSE, renders markdown with syntax-highlighted code blocks
- Slash command autocomplete and `@` reference autocomplete in the composer
- Collapsible thinking sections, tool preview cards, inline approval controls
- Session sidebar with search, create, delete, and pending-approval state
- Advanced Mode: live context usage %, turn summary cards (steps · tools · tokens · errors)
- Settings: profiles, workspaces, memory, APIs, extensions, skills, harness
- Command palette (`⌘K` / `Ctrl+K`) for quick actions

Juice supervises Cubicles as a local process and communicates over HTTP/SSE. It does **not** import `@cubicles/*` into the app bundle.

## Architecture

```
┌─────────────────────────────────────┐
│  Tauri shell                        │
│  – desktop window                   │
│  – Cubicles process supervision     │
└───────────────┬─────────────────────┘
                │ HTTP / SSE
┌───────────────▼─────────────────────┐
│  React UI (Vite + shadcn)           │
│  – sidebar, transcript, composer    │
│  – settings, command palette        │
└───────────────┬─────────────────────┘
                │ 127.0.0.1:7799
┌───────────────▼─────────────────────┐
│  Cubicles runtime                   │
│  – sessions, profiles, workspaces   │
│  – tools, skills, approvals         │
│  – model / provider execution       │
└─────────────────────────────────────┘
```

See [`docs/how-juice-works.md`](docs/how-juice-works.md) and [`docs/cubicles-integration.md`](docs/cubicles-integration.md) for more detail.

## Setup

Set `JUICE_CUBICLES_ROOT` in `.env` (copy from `.env.example`) to point at your Cubicles workspace:

```env
JUICE_CUBICLES_ROOT=/path/to/cubicles-ts
```

## Scripts

```bash
npm install               # install dependencies
npm run tauri:dev         # dev window (builds Cubicles on start)
npm run package:runtime   # snapshot Cubicles into src-tauri/resources
npm run tauri:build       # packaged app
npm run lint              # ESLint
npm run build             # Vite build only
```

## Requirements

- **Node.js ≥25** — required at build time and at runtime (Juice spawns `node` to run the Cubicles server)
- **Rust toolchain** — for Tauri ([prerequisites](https://tauri.app/start/prerequisites/))
- **A built Cubicles workspace** at `JUICE_CUBICLES_ROOT`

### Platform support

| Platform | Status |
|----------|--------|
| macOS | ✅ |
| Windows | ✅ (Node.js must be on `PATH`) |
| Linux | ✅ |

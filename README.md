# Juice

Desktop shell for a personal AI assistant built with **Tauri + Vite + React**, powered by your **Cubicles** runtime as the backend.

## What Juice does

- Streams chat via SSE, renders markdown with syntax-highlighted code blocks
- Slash command autocomplete and `@` reference autocomplete in the composer
- Collapsible thinking sections, tool preview cards, inline approval controls
- Session sidebar with search, create, delete, and pending-approval state
- Advanced Mode: live context usage %, turn summary cards (steps · tools · tokens · errors)
- Settings: profiles, **working folder** (on-disk project directory), memory, APIs, extensions, skills, harness
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
│  – sessions, profiles, workspace path │
│  – tools, skills, approvals         │
│  – model / provider execution       │
└─────────────────────────────────────┘
```

See [`docs/how-juice-works.md`](docs/how-juice-works.md), [`docs/cubicles-integration.md`](docs/cubicles-integration.md), and [`docs/build-and-bundle.md`](docs/build-and-bundle.md) for more detail.

## Working folder

Cubicles treats the agent workspace as a **real directory on disk**. Before you can chat, Juice needs that path:

1. Open **Settings → Working folder**, choose or paste an absolute path (desktop builds include a folder picker).
2. Juice stores the choice in `localStorage` (`juice:working-directory`) and restores it on the next launch until you change it.
3. New sessions are created with that path; chat and slash requests send `workspace_path` so Cubicles can resolve the session. Trust for folders is handled by Cubicles (`cubicles trust`); the supervised server sets `CUBICLES_SKIP_TRUST_PROMPT=1` so headless startup is not blocked.

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

## Packaging

Juice packages as a native Tauri desktop app. The standard packaging command is:

```bash
npm run tauri:build
```

That build already runs the frontend build and snapshots the Cubicles runtime into `src-tauri/resources/` through `beforeBuildCommand`.

Platform bundle outputs:

- macOS: `src-tauri/target/release/bundle/macos/Juice.app`
- macOS DMG: `src-tauri/target/release/bundle/dmg/Juice_0.1.0_aarch64.dmg` or the architecture that matches the build host
- Windows: `src-tauri/target/release/bundle/` with `.msi` and NSIS `.exe` installers when built on Windows

For full packaging instructions, prerequisites, and platform-specific notes, see [`docs/build-and-bundle.md`](docs/build-and-bundle.md).

## Requirements

- **Node.js ≥25** — required at build time and at runtime (Juice spawns `node` to run the Cubicles server)
- **Rust toolchain** — for Tauri ([prerequisites](https://tauri.app/start/prerequisites/))
- **A built Cubicles workspace** at `JUICE_CUBICLES_ROOT`
- **Platform-native build host for installers** — build the macOS app on macOS and Windows installers on Windows unless you add your own cross-compilation/signing setup

### Platform support

| Platform | Status |
|----------|--------|
| macOS | ✅ |
| Windows | ✅ (Node.js must be on `PATH`) |
| Linux | ✅ |

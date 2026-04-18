# Juice

Desktop shell for a personal AI assistant built with **Tauri + Vite + React**, using your external **Cubicles** runtime as the backend.

## What Juice is

Juice is a slim, modern desktop UI layer around Cubicles.

**Chat**
- Streams chat responses from Cubicles via SSE (`/api/chat/stream`)
- Renders assistant markdown with syntax-highlighted code blocks (Shiki)
- Renders collapsible thinking sections from live `<think>` blocks and persisted history
- Renders slash command / result pairs inline in the transcript
- Inline approve / reject / redirect controls for pending tool approvals
- Slash command autocomplete popup above the composer (compact, keyboard-navigable)
- Transcript export — downloads session as Markdown with a Sonner toast showing the save path
- Command palette (⌘K) for quick actions: new session, settings, export, delete

**Sessions**
- Lists, creates, activates, and deletes Cubicles sessions from the sidebar
- Sidebar search/filter by title, workspace, or preview text
- Rehydrates full persisted session history on activation
- Handles `turn_summary` and `compressing` events from the Cubicles stream

**Settings** — multi-tab dialog with compact, dialog-based create/edit forms:
- **Overview** — backend health, connection diagnostics, provider hints
- **Profiles** — create (dialog), edit, set default, delete
- **Workspaces** — register (dialog), edit, set default, delete
- **Memory** — MEMORY.md path configuration
- **APIs** — description-only rows; register (dialog), edit (pencil dialog), enable/disable, delete
- **Extensions** — enable/default toggles
- **Skills** — enable/default toggles
- **Harness** — full harness configuration surface (budget, steps, reserve multipliers, etc.)

**Appearance**
- Custom SVG app icon (juice glass)
- Tropical color scheme with light/dark mode toggle
- Slim, modern layout — no bulky components

**Packaging**
- Bundles a packaged Cubicles runtime snapshot for `tauri build`
- Uses the live `cubicles-ts` checkout in development (always rebuilds on start)

Juice does **not** import `@cubicles/*` directly into the app bundle. It supervises Cubicles as a separate local process and communicates over HTTP/SSE.

## Architecture

```
┌─────────────────────────────────────┐
│  Tauri shell                        │
│  – desktop window                   │
│  – Cubicles process supervision     │
│  – shell plugin + FS plugin         │
└───────────────┬─────────────────────┘
                │ HTTP / SSE
┌───────────────▼─────────────────────┐
│  React UI (Vite + shadcn)           │
│  – sidebar, transcript, composer    │
│  – settings (8 tabs)                │
│  – command palette, toasts          │
└───────────────┬─────────────────────┘
                │ local API  127.0.0.1:7799
┌───────────────▼─────────────────────┐
│  Cubicles runtime                   │
│  – sessions, profiles, workspaces   │
│  – tools, skills, approvals         │
│  – model / provider execution       │
└─────────────────────────────────────┘
```

More detail:

- [`docs/how-juice-works.md`](docs/how-juice-works.md)
- [`docs/cubicles-integration.md`](docs/cubicles-integration.md)

## Local Cubicles dependency

Juice expects your Cubicles workspace at:

```text
/Users/goatcheese/Documents/repositories/cubicles-ts
```

Backend target: `http://127.0.0.1:7799`

## Scripts

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server
npm run lint         # ESLint
npm run build        # production Vite build
npm run package:runtime   # snapshot cubicles-ts into src-tauri/resources
npm run tauri:dev    # Tauri dev window
npm run tauri:build  # packaged macOS app
```

## Requirements

- Node.js 20+
- Rust toolchain (for Tauri)
- A built Cubicles workspace at the path above

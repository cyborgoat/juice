# Cubicles integration

## Are we importing `@cubicles/{module}`?

No. Juice uses Cubicles in two other ways instead.

## 1. Build-time and launch-time integration

Juice uses Node scripts to work with your external Cubicles workspace:

### `scripts/build-cubicles-server.mjs`

- reads `JUICE_CUBICLES_ROOT`
- runs `npm run build` inside the Cubicles workspace
- in development mode, Juice **always** rebuilds to pick up the latest changes

### `scripts/run-cubicles-server.mjs`

- resolves `packages/server/dist/index.js` inside the Cubicles workspace
- dynamically imports that built server entry
- calls `startServer({ host, port })`

This means Juice uses the **compiled Cubicles server output** at runtime without statically importing `@cubicles/server` or `@cubicles/core` into the Juice source tree.

## 2. API integration

Once the server is running, Juice talks to Cubicles over its local HTTP/SSE API.

The API client is in `src/lib/cubicles-api/client.ts`. It wraps:

**Core**
- health
- settings (read + update)

**Sessions**
- list, create, activate
- session history
- chat streaming (SSE)
- pending approvals (approve, reject, redirect, stop)

**Slash**
- `GET /api/slash` — list commands
- `POST /api/slash` — execute a command

**Profiles**
- list, create, read detail, update, delete

**Workspaces**
- list, create, update, delete, set default

**Memory**
- get config

**APIs**
- list, list groups, create, update, delete

**Extensions & Skills**
- list, update enable/default

**Harness**
- get config, update config

## Backend supervision

`src/lib/tauri/cubicles-backend.ts` bridges the desktop app and Cubicles:

1. checks backend health,
2. builds Cubicles if needed,
3. spawns the Cubicles server,
4. waits for the health endpoint,
5. exposes the local API base to the frontend.

Local backend target: `http://127.0.0.1:7799`

## UI usage

`src/features/chat/chat-panel.tsx` orchestrates:

- fetch settings, profiles, sessions on mount
- fetch + render session history on activation
- create and delete sessions
- stream new chat replies
- execute slash commands from the composer
- restore pending approvals for the active session

`src/features/chat/transcript-helpers.ts` now owns the chat feed normalization layer:

- maps Cubicles history rows into Juice transcript entries
- reduces live SSE events into the same transcript model
- converts tool preview / call / approval / result events into stable tool cards
- preserves live-only entries while history queries rehydrate

`src/components/chat/` then renders that normalized model with dedicated rows for messages, slash events, tool previews, tool cards, turn summaries, and shared shimmer-based working indicators.

Profile selection priority:
1. `settings.default_profile` if set
2. first available profile from `GET /api/profiles`

## Why this design was chosen

Juice is loosely coupled to Cubicles:

- Cubicles remains independently buildable and runnable
- Juice stays a thin desktop/UI shell
- Runtime changes in Cubicles mostly stay behind the server API boundary
- The same backend can be tested independently of the UI

Tradeoff: Juice depends on the external Cubicles workspace path and local process startup.

## If you want direct package imports later

A future version could import Cubicles packages directly by turning `juice` into a workspace consumer of `@cubicles/core`, `@cubicles/server`, etc. That would require workspace linking, shared build orchestration, and careful bundling boundaries between Tauri, Node-only server code, and browser code. For now, the process-and-API boundary is the active architecture.

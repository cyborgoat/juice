# Cubicles integration

## Are we importing `@cubicles/{module}`?

No, not inside the Juice app codebase.

A search in this repository currently finds **no direct `@cubicles/*` imports**. Juice uses Cubicles in two other ways instead.

## 1. Build-time and launch-time integration

Juice uses two Node scripts to work with your external Cubicles workspace:

### `scripts/build-cubicles-server.mjs`

- reads `JUICE_CUBICLES_ROOT`
- runs `npm run build` inside the Cubicles workspace

### `scripts/run-cubicles-server.mjs`

- resolves `packages/server/dist/index.js` inside the Cubicles workspace
- dynamically imports that built server entry
- calls `startServer({ host, port })`

This means Juice is using the **compiled Cubicles server output** at runtime, even though it does not statically import `@cubicles/server` or `@cubicles/core` into the Juice source tree.

## 2. API integration

Once the server is running, Juice talks to Cubicles over its local API.

The API client is in:

- `src/lib/cubicles-api/client.ts`

It currently wraps:

- health
- settings
- profiles
- sessions
- session history
- chat streaming

The Cubicles server also exposes slash-command APIs:

- `GET /api/slash` to list commands
- `POST /api/slash` to execute a command

Juice does not fully surface those yet, but they are part of the active roadmap because Cubicles already has the shared slash-command dispatcher behind them.

## Backend supervision

`src/lib/tauri/cubicles-backend.ts` is the bridge between the desktop app and Cubicles.

It is responsible for:

1. checking backend health,
2. building Cubicles if needed,
3. spawning the Cubicles server,
4. waiting for the health endpoint,
5. exposing the local API base to the frontend.

Current local backend target:

```text
http://127.0.0.1:7799
```

## UI usage

`src/features/assistant/desktop-assistant.tsx` uses the Cubicles API client to:

- fetch settings
- fetch profiles
- fetch sessions
- fetch session history
- create sessions
- activate sessions
- stream new chat replies

Profile selection currently works like this:

1. use `settings.default_profile` if present,
2. otherwise use the first available profile from `GET /api/profiles`.

## Cubicles features Juice can still adopt

Based on the Cubicles docs, the backend already supports several surfaces the desktop app has not fully implemented yet:

- slash-command listing and execution
- slash-command transcript echoing
- slash autocomplete and argument suggestions
- approval / reject / redirect flows
- structured outputs for sessions, profiles, skills, memory, tools, and apis
- settings/runtime metadata surfaces

These are tracked in [`../todo.md`](../todo.md).

## Why this design was chosen

This keeps Juice loosely coupled to your established Cubicles framework.

Benefits:

- Cubicles remains independently buildable and runnable.
- Juice can be a thin desktop/UI shell.
- Runtime changes in Cubicles mostly stay behind the server API boundary.
- The same Cubicles backend can be tested independently from the UI.

Tradeoff:

- Juice depends on the external Cubicles workspace path and local process startup.

## If you want direct package imports later

A future version could import Cubicles packages directly, for example by turning `juice` into a workspace consumer of:

- `@cubicles/core`
- `@cubicles/server`
- other shared packages

That would make the coupling tighter and would likely require:

- workspace linking,
- shared build orchestration,
- careful bundling boundaries between Tauri, Node-only server code, and browser code.

For the current implementation, the process-and-API boundary is the active architecture.

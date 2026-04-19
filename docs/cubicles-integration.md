# Cubicles integration

Juice does **not** import `@cubicles/*`. It integrates with Cubicles in two ways.

## 1. Process integration

At startup, Juice uses Node scripts to build and launch Cubicles:

- `scripts/build-cubicles-server.mjs` — reads `JUICE_CUBICLES_ROOT`, runs `npm run build` inside the workspace (always in dev, skipped if bundled runtime is present)
- `scripts/run-cubicles-server.mjs` — resolves `packages/server/dist/index.js` and calls `startServer({ host, port })`

In packaged builds, `npm run package:runtime` snapshots Cubicles into `src-tauri/resources/cubicles-runtime` so the app is self-contained (except for Node.js itself, which must be installed on the host).

Backend supervision lives in `src/lib/tauri/cubicles-backend.ts`:
1. Check health at `http://127.0.0.1:7799/health`
2. If unhealthy: build → spawn → wait for health
3. Expose the API base to the frontend

## 2. HTTP/SSE API integration

Once running, Juice talks to Cubicles over its local API. The client is in `src/lib/cubicles-api/client.ts`.

| Area | Endpoints |
|------|-----------|
| Health / settings | `GET /api/settings` |
| Sessions | list, create, activate, history, delete |
| Chat | `POST /api/chat/stream` (SSE), `GET /api/chat/pending/:id` |
| Approvals | approve, reject, redirect, stop |
| Slash commands | `GET /api/slash`, `POST /api/slash` |
| Profiles | list, create, read, update, delete |
| Workspaces | list, create, update, delete, set default |
| APIs | list, create, update, delete |
| Extensions / Skills | list, enable/disable |
| Harness | get config, update config |
| Memory | get config |
| Tool references | `GET /api/tools/references` |

## Why process + API, not direct imports

- Cubicles stays independently buildable and runnable
- Juice stays a thin desktop/UI shell
- Runtime changes in Cubicles stay behind the API boundary
- The backend can be tested independently of the UI

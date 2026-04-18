# Juice todo

## Rule of thumb

- Keep the codebase elegant, clear, and easy to maintain.
- Prefer understanding and refactoring existing code paths over hard-coding new logic on top.
- Reuse and simplify when possible instead of incrementally stacking duplicate behavior.
- Keep the app modern and slim; avoid bulky components or heavy-handed UI additions.

---

## Backlog

### Chat

- **File attachment** — add a paperclip/attach button to the composer that uploads files via `POST /api/upload`; supported types: `.txt`, `.md`, `.csv`, `.json`, `.yaml`, `.log`, `.xml`, `.html`, `.docx`, `.pdf` (max 20 MB per harness config); show upload result as a system entry in the transcript

- **Compact button** — add a small "compact" action to the chat header or command palette that fires `/compact soft` (or lets the user pick soft/hard); show confirmation and the resulting token delta in a toast

### Sessions

- **Inline session rename** — double-click or an edit icon on the sidebar session name triggers an inline editable field; calls `PATCH /api/sessions/:id` with the new name

- **Session workspace reassignment** — allow changing a session's workspace from its context menu or a detail panel; calls `PATCH /api/sessions/:id` with `workspace_id`

### Memory tab

The current Memory tab only shows the MEMORY.md path. Cubicles exposes a rich memory API:

- **Long-term facts viewer** — show the facts array from `GET /api/memory` in a readable list; allow deleting or editing individual facts
- **Memory documents browser** — list docs from `GET /api/memory/documents`; click to open a read-only (or editable) viewer using `GET /api/memory/documents/:identifier` and `PUT /api/memory/documents/:identifier`
- **Memory search** — search bar in the Memory tab that queries `GET /api/memory/search?q=`
- **LLM fact extraction** — "Extract from session" button that calls `POST /api/memory/extract` for the active session, shows candidate facts, then lets the user apply them via `POST /api/memory/apply-diff`

### Settings

- **APIs group rename** — expose `POST /api/apis/groups/:group/rename` in the APIs tab (e.g., a rename button on each group badge)

- **Skills rescan** — add a "Rescan" button in the Skills tab that calls `POST /api/skills/scan` and refreshes the list

- **Unified tools catalog** — optional "Tools" tab (or expandable section in Overview) backed by `GET /api/tools`; shows primitives, extensions, APIs, and skills grouped together with their enabled/disabled state

### Infrastructure

- **Packaged runtime → sidecar binary** — evaluate replacing the Node-managed Cubicles resources with a dedicated Tauri sidecar so the app is fully self-contained without requiring a Node runtime on the host machine



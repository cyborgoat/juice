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

### Settings

- **APIs group rename** — expose `POST /api/apis/groups/:group/rename` in the APIs tab (e.g., a rename button on each group badge)

- **Skills rescan** — add a "Rescan" button in the Skills tab that calls `POST /api/skills/scan` and refreshes the list

- **Unified tools catalog** — optional "Tools" tab (or expandable section in Overview) backed by `GET /api/tools`; shows primitives, extensions, APIs, and skills grouped together with their enabled/disabled state

### Infrastructure

- **Packaged runtime → sidecar binary** — evaluate replacing the Node-managed Cubicles resources with a dedicated Tauri sidecar so the app is fully self-contained without requiring a Node runtime on the host machine

- **Cross-platform release packaging** — add a GitHub Actions release workflow with a native build matrix for `macos-latest` and `windows-latest`; run `npm install` and `npm run tauri:build` on each host, upload artifacts from `src-tauri/target/release/bundle/`, and support macOS `.app` / `.dmg` plus Windows `.msi` / NSIS `.exe`

- **CI runtime packaging input** — remove the release build dependency on an arbitrary local `JUICE_CUBICLES_ROOT`; either vendor the Cubicles runtime snapshot for release builds or add a deterministic CI step that checks out and builds Cubicles in a known path before `npm run package:runtime`

- **Release signing and notarization** — when packaging is automated, add platform trust work: Apple code signing plus notarization for macOS, and Authenticode signing for Windows installers


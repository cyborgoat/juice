# Juice todo

This file tracks the major product work still pending for the desktop app.

## Rule of thumb

- Keep the codebase elegant, clear, and easy to maintain.
- Prefer understanding and refactoring existing code paths over hard-coding new logic on top.
- Reuse and simplify when possible instead of incrementally stacking duplicate behavior.
- Keep the app modern and slim; avoid bulky components or heavy-handed UI additions.

## High priority

- Investigate the remaining packaged-app blank screen after `tauri build` (capture bundled-app logs, inspect packaged runtime errors, and verify the final asset/runtime bootstrap path)
- Improve slash-command result presentation for richer structured outputs
- Harden approval recovery when reopening older sessions with persisted pending tools

## Chat and transcript improvements

- Improve tool preview / tool result rendering
- Add desktop support for structured slash outputs
- Add clearer session history rendering for older entries and multi-line slash results
- Add copy actions for assistant messages / code blocks
- Improve markdown code block presentation

## Session management

- Better empty state handling
- Restore active session more explicitly on app launch

## Settings

- Backend/runtime testing flows and richer diagnostics
- Live validation for API key registration

## Cubicles feature parity targets

- Surface skills from `~/.cubicles/skills/`
- Surface grouped API tools from `~/.cubicles/apis/`
- Surface server settings/runtime metadata already exposed by Cubicles

## Desktop/productization

- Improve startup diagnostics and recovery flows for packaged runtime launches
- Add friendlier backend failure guidance in the UI
- Consider whether the bundled Cubicles runtime should eventually move from Node-managed resources to a dedicated sidecar binary

## Nice to have

- Search/filter improvements for large session lists
- Better onboarding and first-run experience
- Transcript export/share actions
- Command palette style quick actions

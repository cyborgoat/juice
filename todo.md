# Juice todo

This file tracks the major product work still pending for the desktop app.

## Rule of thumb

- Keep the codebase elegant, clear, and easy to maintain.
- Prefer understanding and refactoring existing code paths over hard-coding new logic on top.
- Reuse and simplify when possible instead of incrementally stacking duplicate behavior.
- Keep the app modern and slim; avoid bulky components or heavy-handed UI additions.

## Completed

- ~~Copy actions for assistant messages / code blocks~~ — CopyButton component, copy on messages/slash/tool outputs
- ~~Markdown code block presentation~~ — Shiki syntax highlighting, language labels, borders, max-height scroll
- ~~Tool preview / tool result rendering~~ — Collapsible sections, step indicator (N/M)
- ~~Slash-command result presentation~~ — Copy button, structured output support
- ~~Approval recovery~~ — Polling with refetchInterval, refetchOnWindowFocus/Reconnect
- ~~Session empty state~~ — Differentiated no-sessions vs no-search-results, welcome CTA
- ~~Session history rendering~~ — Clearer older entries, active session restoration
- ~~Backend diagnostics~~ — Connection test, logs viewer, troubleshooting guidance in Settings
- ~~Backend failure guidance~~ — Error state UI with diagnostic pointers
- ~~Cubicles feature parity~~ — Skills, APIs, extensions tabs fully implemented
- ~~Transcript export~~ — Download conversation as markdown
- ~~Command palette~~ — ⌘K quick actions (new session, settings, export, delete)
- ~~Onboarding~~ — Welcome state with New Session CTA and keyboard shortcut hint
- ~~Search/filter~~ — Session sidebar search by title/workspace/preview

## Remaining considerations

- Consider whether the bundled Cubicles runtime should eventually move from Node-managed resources to a dedicated sidecar binary

# Juice docs

This folder explains how Juice works as a desktop shell over the external Cubicles runtime.

## Documents

- [How Juice works](./how-juice-works.md)
- [Cubicles integration](./cubicles-integration.md)

## Short answer

Juice does **not** currently import `@cubicles/*` directly in the app bundle.

Instead, the desktop app:

1. builds the external Cubicles workspace,
2. launches the Cubicles server as a local child process,
3. talks to that server over HTTP and SSE,
4. renders the desktop UX around sessions, chat, and backend state.

## Current state

The current desktop app already supports:

- managed Cubicles backend startup
- real session listing and activation
- real streamed chat replies
- compact session drawer UI
- assistant markdown rendering
- collapsible embedded thinking sections

Still planned:

- settings surfaces
- slash-command compatibility
- slash autocomplete
- desktop approval controls
- production packaging/runtime bundling

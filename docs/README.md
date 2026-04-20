# Juice docs

This folder explains how Juice works as a desktop shell over the external Cubicles runtime.

## Documents

- [How Juice works](./how-juice-works.md)
- [Cubicles integration](./cubicles-integration.md)
- [Build and bundle guide](./build-and-bundle.md)

## Short answer

Juice does **not** currently import `@cubicles/*` directly in the app bundle.

Instead, the desktop app:

1. builds the external Cubicles workspace,
2. launches the Cubicles server as a local child process,
3. talks to that server over HTTP and SSE,
4. renders the desktop UX around sessions, chat, and backend state.

## Current state

The current desktop app already supports:

- managed Cubicles backend startup (with headless trust skip for the child process)
- persisted **working folder** selection and `workspace_path` on chat, slash, and sessions
- real session listing, activation, and create/delete flows
- real streamed chat replies
- compact session drawer UI
- assistant markdown rendering
- collapsible embedded thinking sections
- slash command listing, execution, autocomplete, and transcript echoing
- persisted session-history rehydration from Cubicles

Still planned:

- richer structured slash/tool rendering
- approval recovery hardening across reopened sessions
- production packaging/runtime diagnostics

## Packaging note

Juice ships as a Tauri desktop bundle. Use `npm run tauri:build` to produce native artifacts, and use the platform-specific instructions in [Build and bundle guide](./build-and-bundle.md) for macOS and Windows packaging details.

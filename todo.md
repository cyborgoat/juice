# Juice todo

This file tracks the major product work still pending for the desktop app.

## High priority

- Add **slash-command compatibility** in the desktop composer
  - support `/help`, `/new`, `/session`, `/sessions`, `/profile`, `/workspace`, `/memory`, `/api`, `/compact`, `/skills`, `/tools`
  - use Cubicles `GET /api/slash` and `POST /api/slash`
  - render slash command input/result pairs clearly in the transcript

- Add **slash-command autocomplete**
  - `/` to list top-level commands
  - argument/subcommand suggestions after a command prefix
  - keyboard navigation and selection inside the desktop composer

- Add **approval UX** for tool actions
  - approve
  - reject
  - redirect with note
  - keep approval controls attached to the active chat/composer flow

## Chat and transcript improvements

- Improve tool preview / tool result rendering
- Add desktop support for structured slash outputs
- Add clearer session history rendering for older entries
- Add copy actions for assistant messages / code blocks
- Improve markdown code block presentation

## Session management

- Rename sessions
- Delete/archive sessions
- Better empty state handling
- Restore active session more explicitly on app launch

## Settings

- Workspace management tab (list, switch, create workspaces)
- Backend/runtime testing flows and richer diagnostics
- Live validation for API key registration

## Cubicles feature parity targets

- Surface skills from `~/.cubicles/skills/`
- Surface grouped API tools from `~/.cubicles/apis/`
- Surface workspaces and workspace switching flows
- Surface server settings/runtime metadata already exposed by Cubicles

## Desktop/productization

- Productionize the Cubicles runtime strategy
  - move from developer-style external workspace assumptions toward a packaged runtime/sidecar approach
- Improve startup diagnostics and recovery flows
- Add friendlier backend failure guidance in the UI
- Package and test the app as a real production desktop build

## Nice to have

- Search/filter improvements for large session lists
- Better onboarding and first-run experience
- Transcript export/share actions
- Command palette style quick actions

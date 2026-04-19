import type { CubiclesSlashCommand } from "@/lib/cubicles-api/types"

type SessionSuggestion = {
  id: string
  title: string
}

export type SlashSuggestion = {
  label: string
  description?: string
  nextValue: string
}

type SlashAutocompleteContext = {
  draft: string
  commands: CubiclesSlashCommand[]
  profiles: string[]
  sessions: SessionSuggestion[]
}

function normalizeCommandName(name: string) {
  return name.startsWith("/") ? name : `/${name}`
}

function filterByPrefix<T extends { label: string }>(items: T[], prefix: string) {
  const normalizedPrefix = prefix.trim().toLowerCase()
  if (!normalizedPrefix) {
    return items
  }

  return items.filter((item) => item.label.toLowerCase().startsWith(normalizedPrefix))
}

function staticSuggestions(
  values: Array<{ label: string; description?: string }>,
  prefix: string,
  buildNextValue: (label: string) => string
) {
  return filterByPrefix(values, prefix).map((value) => ({
    label: value.label,
    description: value.description,
    nextValue: buildNextValue(value.label),
  }))
}

function sessionSuggestions(
  sessions: SessionSuggestion[],
  prefix: string,
  buildNextValue: (id: string) => string
) {
  return filterByPrefix(
    sessions.map((session) => ({
      label: session.id,
      description: session.title,
    })),
    prefix
  ).map((session) => ({
    ...session,
    nextValue: buildNextValue(session.label),
  }))
}

function profileSuggestions(
  profiles: string[],
  prefix: string,
  buildNextValue: (name: string) => string
) {
  return filterByPrefix(
    profiles.map((profile) => ({
      label: profile,
    })),
    prefix
  ).map((profile) => ({
    ...profile,
    nextValue: buildNextValue(profile.label),
  }))
}

export function getSlashSuggestions({
  draft,
  commands,
  profiles,
  sessions,
}: SlashAutocompleteContext): SlashSuggestion[] {
  if (!draft.startsWith("/")) {
    return []
  }

  const hasTrailingSpace = /\s$/.test(draft)
  const tokens = draft.trim().split(/\s+/).filter(Boolean)
  const commandToken = tokens[0] ?? "/"

  if (tokens.length <= 1 && !hasTrailingSpace) {
    return filterByPrefix(
      commands.map((command) => ({
        label: normalizeCommandName(command.name),
        description: command.description,
      })),
      commandToken
    ).map((command) => ({
      ...command,
      nextValue: `${command.label} `,
    }))
  }

  const command = normalizeCommandName(commandToken)
  const args = hasTrailingSpace ? [...tokens.slice(1), ""] : tokens.slice(1)
  const currentArgIndex = Math.max(args.length - 1, 0)
  const currentArg = args[currentArgIndex] ?? ""
  const base = [command, ...args.slice(0, currentArgIndex)].join(" ").trim()
  const prefixBase = base ? `${base} ` : `${command} `

  switch (command) {
    case "/session":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [{ label: "history", description: "Show current session history" }],
          currentArg,
          (label) => `${command} ${label} `
        )
      }
      return []
    case "/sessions":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [
            { label: "list", description: "List all sessions" },
            { label: "history", description: "Show session history" },
            { label: "switch", description: "Switch the active session" },
            { label: "delete", description: "Delete a session" },
          ],
          currentArg,
          (label) => `${command} ${label} `
        )
      }

      if (
        currentArgIndex === 1 &&
        ["history", "switch", "delete"].includes(args[0] ?? "")
      ) {
        return sessionSuggestions(sessions, currentArg, (id) => `${prefixBase}${id}`)
      }

      return []
    case "/profile":
      if (currentArgIndex === 0) {
        return profileSuggestions(profiles, currentArg, (name) => `${command} ${name}`)
      }
      return []
    case "/api":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [
            { label: "list", description: "List registered APIs" },
            { label: "register", description: "Register a remote API tool" },
            { label: "enable", description: "Enable a registered API" },
            { label: "disable", description: "Disable a registered API" },
            { label: "remove", description: "Remove a registered API" },
          ],
          currentArg,
          (label) => `${command} ${label} `
        )
      }
      return []
    case "/memory":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [
            { label: "show", description: "Print MEMORY.md" },
            { label: "update", description: "Update memory from session history" },
            { label: "search", description: "Search long-term memory" },
            { label: "set", description: "Save a curated fact" },
            { label: "write", description: "Write the memory document" },
          ],
          currentArg,
          (label) => `${command} ${label} `
        )
      }
      return []
    case "/skills":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [
            { label: "list", description: "List skills" },
            { label: "enable", description: "Enable a skill" },
            { label: "disable", description: "Disable a skill" },
            { label: "enable-all", description: "Enable all skills" },
            { label: "disable-all", description: "Disable all skills" },
          ],
          currentArg,
          (label) => `${command} ${label} `
        )
      }
      return []
    case "/tools":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [{ label: "list", description: "List visible tools" }],
          currentArg,
          (label) => `${command} ${label}`
        )
      }
      return []
    case "/compact":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [
            { label: "soft", description: "Fast drop of oldest messages" },
            { label: "hard", description: "LLM-powered summary snapshot" },
          ],
          currentArg,
          (label) => `${command} ${label}`
        )
      }
      return []
    case "/extensions":
      if (currentArgIndex === 0) {
        return staticSuggestions(
          [
            { label: "list", description: "List installed extensions" },
            { label: "register", description: "Register an extension from file/dir" },
            { label: "delete", description: "Remove an extension" },
            { label: "enable", description: "Enable a disabled extension" },
            { label: "disable", description: "Disable an extension" },
            { label: "generate", description: "Generate an extension via LLM" },
          ],
          currentArg,
          (label) => `${command} ${label} `
        )
      }
      return []
    case "/new":
    case "/workspace":
      return []
    default:
      return []
  }
}

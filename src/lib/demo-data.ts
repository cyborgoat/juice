export type SessionSummary = {
  id: string
  title: string
  workspace: string
  preview: string
  updatedAtLabel: string
  messageCount: number
  status: "live" | "ready" | "idle"
}

type MessageEntry = {
  id: string
  type: "message"
  role: "user" | "assistant"
  content: string
  timestamp: string
}

type ToolEntry = {
  id: string
  type: "tool"
  name: string
  status: "running" | "awaiting-approval" | "completed"
  detail: string
  output: string
  timestamp: string
}

type SystemEntry = {
  id: string
  type: "system"
  label: string
  content: string
  timestamp: string
}

export type TranscriptEntry = MessageEntry | ToolEntry | SystemEntry

export const demoSessions: SessionSummary[] = [
  {
    id: "desktop-briefing",
    title: "Desktop launch briefing",
    workspace: "juice",
    preview: "Shape the first Tauri milestone around a unified desktop chat shell.",
    updatedAtLabel: "Active now",
    messageCount: 12,
    status: "live",
  },
  {
    id: "profile-polish",
    title: "Profile and settings polish",
    workspace: "~/.cubicles",
    preview: "Keep onboarding focused on provider-backed Cubicles profiles for v1.",
    updatedAtLabel: "12 min ago",
    messageCount: 8,
    status: "ready",
  },
  {
    id: "session-flow",
    title: "Session flow draft",
    workspace: "juice",
    preview: "Sidebar should support create, rename, switch, and delete flows cleanly.",
    updatedAtLabel: "Yesterday",
    messageCount: 5,
    status: "idle",
  },
]

export const demoTranscripts: Record<string, TranscriptEntry[]> = {
  "desktop-briefing": [
    {
      id: "briefing-system",
      type: "system",
      label: "Desktop runtime",
      content:
        "Tauri is initialized and the shell is ready for Cubicles server wiring in the next phase.",
      timestamp: "08:31",
    },
    {
      id: "briefing-user-1",
      type: "message",
      role: "user",
      content:
        "Start building the desktop assistant with a single chat surface and session sidebar.",
      timestamp: "08:32",
    },
    {
      id: "briefing-assistant-1",
      type: "message",
      role: "assistant",
      content:
        "I scaffolded the Vite + React app, initialized Tauri, and set up Tailwind and shadcn so the first desktop shell can land on a stable foundation.",
      timestamp: "08:33",
    },
    {
      id: "briefing-tool-1",
      type: "tool",
      name: "cubicles-server",
      status: "awaiting-approval",
      detail: "Desktop runtime supervision",
      output:
        "Next milestone: spawn and monitor the local Cubicles backend, then stream real session data into this shell.",
      timestamp: "08:34",
    },
    {
      id: "briefing-assistant-2",
      type: "message",
      role: "assistant",
      content:
        "This screen is the intended end state: one continuous transcript, in-context tool state, and a sidebar that behaves like a true session manager instead of a page switcher.",
      timestamp: "08:35",
    },
  ],
  "profile-polish": [
    {
      id: "profile-system",
      type: "system",
      label: "Scope note",
      content:
        "Provider-backed models are the v1 target. Local model management stays out of the first milestone.",
      timestamp: "07:58",
    },
    {
      id: "profile-assistant-1",
      type: "message",
      role: "assistant",
      content:
        "Settings should foreground default profile, workspace, backend health, and future tool/memory surfaces without breaking the main chat rhythm.",
      timestamp: "08:01",
    },
  ],
  "session-flow": [
    {
      id: "session-user-1",
      type: "message",
      role: "user",
      content: "What belongs in the sidebar versus the main transcript area?",
      timestamp: "Yesterday",
    },
    {
      id: "session-assistant-1",
      type: "message",
      role: "assistant",
      content:
        "Keep sessions and navigation in the sidebar. Everything conversational, including approvals and tool results, stays inline in the chat stream.",
      timestamp: "Yesterday",
    },
  ],
}

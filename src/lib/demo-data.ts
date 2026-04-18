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
  approvalId?: string
}

type ToolPreviewEntry = {
  id: string
  type: "tool-preview"
  content: string
  timestamp: string
}

type SystemEntry = {
  id: string
  type: "system"
  label: string
  content: string
  timestamp: string
}

type SlashEntry = {
  id: string
  type: "slash"
  variant: "command" | "result"
  content: string
  timestamp: string
}

export type TranscriptEntry = MessageEntry | ToolEntry | ToolPreviewEntry | SystemEntry | SlashEntry

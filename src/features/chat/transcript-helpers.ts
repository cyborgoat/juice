import type { CubiclesChatEvent, CubiclesSessionHistoryMessage } from "@/lib/cubicles-api/types"
import type { CubiclesBackendState } from "@/lib/tauri/cubicles-backend"
import type { TranscriptEntry } from "@/lib/types"

type ToolEvent = Extract<
  CubiclesChatEvent,
  { type: "tool_call" | "tool_running" | "tool_result" | "awaiting_approval" | "tool_skipped" }
>
type ToolEntry = Extract<TranscriptEntry, { type: "tool" }>
type Transcripts = Record<string, TranscriptEntry[]>

export function formatTimestamp(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function buildSessionTitle(totalSessions: number) {
  return `New workspace thread ${totalSessions + 1}`
}

export function buildSystemEntry(label: string, content: string): Extract<TranscriptEntry, { type: "system" }> {
  return { id: `${label.toLowerCase().replace(/\s+/g, "-")}-${crypto.randomUUID()}`, type: "system", label, content, timestamp: "Now" }
}

export function buildAssistantFallbackResponse(input: string): TranscriptEntry {
  return {
    id: `assistant-${crypto.randomUUID()}`,
    type: "message",
    role: "assistant",
    timestamp: "Just now",
    content: `_Backend offline — cannot process "${input.slice(0, 60)}${input.length > 60 ? "…" : ""}". Connect a Cubicles backend in Settings to send messages._`,
  }
}

export function buildLiveSessionPlaceholder(): TranscriptEntry[] {
  return [
    buildSystemEntry(
      "Cubicles session connected",
      "This sidebar entry is already coming from the local Cubicles API. Select it to load the existing history or send a new message to continue the thread.",
    ),
  ]
}

/** Single source of truth for backend status badge + tooltip text. */
export function buildBackendInfo(backendState: CubiclesBackendState): { label: string; tooltip: string } {
  switch (backendState.mode) {
    case "ready":
      return { label: "Cubicles connected", tooltip: "Connected to the local Cubicles backend." }
    case "browser-preview":
      return { label: "Browser preview", tooltip: backendState.detail }
    case "error":
      return { label: "Cubicles error", tooltip: `Backend connection failed: ${backendState.detail}` }
    default:
      return { label: "Cubicles bootstrapping", tooltip: backendState.detail }
  }
}

export function mapHistoryToTranscript(
  history: CubiclesSessionHistoryMessage[] | undefined
): TranscriptEntry[] | null {
  if (!history?.length) return null

  return history.map((message): TranscriptEntry => {
    const id = `history-${message.created_at}-${crypto.randomUUID()}`
    const timestamp = formatTimestamp(message.created_at)
    const { role, content } = message

    if (role === "slash_command" || role === "slash_result") {
      return { id, type: "slash", variant: role === "slash_command" ? "command" : "result", content, timestamp }
    }
    if (role === "thinking") {
      return { id, type: "message", role: "assistant", content: `<think>${content}</think>`, timestamp }
    }
    if (role === "assistant" || role === "user") {
      return { id, type: "message", role, content, timestamp }
    }
    return { id, type: "system", label: role, content, timestamp }
  })
}

/** Maps a streaming tool event into a ToolEntry for the transcript. */
export function buildToolEntry(event: ToolEvent, sessionId: string, streamId: string): ToolEntry {
  const toolName =
    "name" in event
      ? event.name
      : "tool" in event
        ? String(event.tool.name ?? "tool")
        : String(event.pendingTool.name ?? "tool")

  const status: ToolEntry["status"] =
    event.type === "tool_result" || event.type === "tool_skipped"
      ? "completed"
      : event.type === "awaiting_approval"
        ? "awaiting-approval"
        : "running"

  const detail =
    event.type === "tool_call" || event.type === "tool_running"
      ? event.detail
      : event.type === "awaiting_approval"
        ? "Waiting for user approval before execution."
        : "Tool execution update"

  const output =
    event.type === "tool_result"
      ? event.output
      : event.type === "tool_skipped"
        ? "Tool execution was skipped."
        : event.type === "tool_call"
          ? JSON.stringify(event.tool, null, 2)
          : event.type === "awaiting_approval"
            ? JSON.stringify(event.pendingTool, null, 2)
            : "Running..."

  return {
    id: `tool-${sessionId}-${streamId}-${toolName}`,
    type: "tool",
    name: toolName,
    status,
    detail,
    output,
    timestamp: "Now",
    approvalId: event.type === "awaiting_approval" ? event.approvalId : undefined,
    step: event.type === "tool_call" ? event.step : undefined,
    maxSteps: event.type === "tool_call" ? event.maxSteps : undefined,
  }
}

export function buildAssistantStreamEntryId(sessionId: string, streamId: string) {
  return `assistant-live-${sessionId}-${streamId}`
}

export function buildToolPreviewEntryId(sessionId: string, streamId: string) {
  return `tool-preview-${sessionId}-${streamId}`
}

export function appendEntry(prev: Transcripts, sessionId: string, entry: TranscriptEntry): Transcripts {
  return { ...prev, [sessionId]: [...(prev[sessionId] ?? []), entry] }
}

export function upsertEntry(
  prev: Transcripts,
  sessionId: string,
  entryId: string,
  createOrUpdate: (currentEntry?: TranscriptEntry) => TranscriptEntry
): Transcripts {
  const entries = [...(prev[sessionId] ?? [])]
  const idx = entries.findIndex((e) => e.id === entryId)
  if (idx >= 0) {
    entries[idx] = createOrUpdate(entries[idx])
  } else {
    entries.push(createOrUpdate())
  }
  return { ...prev, [sessionId]: entries }
}

export function removeEntry(prev: Transcripts, sessionId: string, entryId: string): Transcripts {
  const entries = prev[sessionId] ?? []
  const next = entries.filter((e) => e.id !== entryId)
  return next.length === entries.length ? prev : { ...prev, [sessionId]: next }
}

export function setToolEntryByApprovalId(
  prev: Transcripts,
  sessionId: string,
  approvalId: string,
  update: (entry: ToolEntry) => ToolEntry
): Transcripts {
  const entries = [...(prev[sessionId] ?? [])]
  const idx = entries.findIndex((e) => e.type === "tool" && e.approvalId === approvalId)
  if (idx < 0 || entries[idx]?.type !== "tool") return prev
  entries[idx] = update(entries[idx] as ToolEntry)
  return { ...prev, [sessionId]: entries }
}


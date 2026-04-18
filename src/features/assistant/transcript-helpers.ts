import type { CubiclesSessionHistoryMessage } from "@/lib/cubicles-api/types"
import type { CubiclesBackendState } from "@/lib/tauri/cubicles-backend"
import type { SessionSummary, TranscriptEntry } from "@/lib/demo-data"

export function formatTimestamp(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function buildSessionTitle(totalSessions: number) {
  return `New workspace thread ${totalSessions + 1}`
}

export function buildAssistantFallbackResponse(input: string): TranscriptEntry {
  return {
    id: `assistant-${crypto.randomUUID()}`,
    type: "message",
    role: "assistant",
    timestamp: "Just now",
    content: `Foundation mode heard: "${input}". The next implementation pass will replace this local response with real Cubicles chat streaming, approvals, and persisted session history.`,
  }
}

export function buildLiveSessionPlaceholder(session: SessionSummary): TranscriptEntry[] {
  return [
    {
      id: `live-session-${session.id}`,
      type: "system",
      label: "Cubicles session connected",
      content:
        "This sidebar entry is already coming from the local Cubicles API. Select it to load the existing history or send a new message to continue the thread.",
      timestamp: "Now",
    },
  ]
}

export function buildBackendBadgeLabel(backendState: CubiclesBackendState) {
  switch (backendState.mode) {
    case "ready":
      return "Cubicles connected"
    case "browser-preview":
      return "Browser preview"
    case "error":
      return "Cubicles error"
    default:
      return "Cubicles bootstrapping"
  }
}

export function buildBackendTooltipContent(backendState: CubiclesBackendState) {
  switch (backendState.mode) {
    case "ready":
      return "Connected to the local Cubicles backend."
    case "browser-preview":
      return backendState.detail
    case "error":
      return `Backend connection failed: ${backendState.detail}`
    default:
      return backendState.detail
  }
}

export function mapHistoryToTranscript(
  history: CubiclesSessionHistoryMessage[] | undefined
): TranscriptEntry[] | null {
  if (!history?.length) {
    return null
  }

  return history.map((message) => {
    const timestamp = formatTimestamp(message.created_at)

    if (message.role === "slash_command") {
      return {
        id: `history-${message.created_at}-${crypto.randomUUID()}`,
        type: "slash",
        variant: "command",
        content: message.content,
        timestamp,
      } satisfies TranscriptEntry
    }

    if (message.role === "slash_result") {
      return {
        id: `history-${message.created_at}-${crypto.randomUUID()}`,
        type: "slash",
        variant: "result",
        content: message.content,
        timestamp,
      } satisfies TranscriptEntry
    }

    if (message.role === "assistant" || message.role === "user") {
      return {
        id: `history-${message.created_at}-${crypto.randomUUID()}`,
        type: "message",
        role: message.role,
        content: message.content,
        timestamp,
      } satisfies TranscriptEntry
    }

    if (message.role === "thinking") {
      return {
        id: `history-${message.created_at}-${crypto.randomUUID()}`,
        type: "message",
        role: "assistant",
        content: `<think>${message.content}</think>`,
        timestamp,
      } satisfies TranscriptEntry
    }

    return {
      id: `history-${message.created_at}-${crypto.randomUUID()}`,
      type: "system",
      label: message.role,
      content: message.content,
      timestamp,
    } satisfies TranscriptEntry
  })
}

export function appendEntry(
  previousTranscripts: Record<string, TranscriptEntry[]>,
  sessionId: string,
  entry: TranscriptEntry
) {
  return {
    ...previousTranscripts,
    [sessionId]: [...(previousTranscripts[sessionId] ?? []), entry],
  }
}

export function upsertEntry(
  previousTranscripts: Record<string, TranscriptEntry[]>,
  sessionId: string,
  entryId: string,
  createOrUpdate: (currentEntry?: TranscriptEntry) => TranscriptEntry
) {
  const currentEntries = [...(previousTranscripts[sessionId] ?? [])]
  const currentIndex = currentEntries.findIndex((entry) => entry.id === entryId)

  if (currentIndex >= 0) {
    currentEntries[currentIndex] = createOrUpdate(currentEntries[currentIndex])
  } else {
    currentEntries.push(createOrUpdate())
  }

  return {
    ...previousTranscripts,
    [sessionId]: currentEntries,
  }
}

export function buildAssistantStreamEntryId(sessionId: string, streamId: string) {
  return `assistant-live-${sessionId}-${streamId}`
}

export function buildToolPreviewEntryId(sessionId: string, streamId: string) {
  return `tool-preview-${sessionId}-${streamId}`
}

export function removeEntry(
  previousTranscripts: Record<string, TranscriptEntry[]>,
  sessionId: string,
  entryId: string
) {
  const currentEntries = previousTranscripts[sessionId] ?? []
  const nextEntries = currentEntries.filter((entry) => entry.id !== entryId)

  if (nextEntries.length === currentEntries.length) {
    return previousTranscripts
  }

  return {
    ...previousTranscripts,
    [sessionId]: nextEntries,
  }
}

export function setToolEntryByApprovalId(
  previousTranscripts: Record<string, TranscriptEntry[]>,
  sessionId: string,
  approvalId: string,
  update: (
    entry: Extract<TranscriptEntry, { type: "tool" }>
  ) => Extract<TranscriptEntry, { type: "tool" }>
) {
  const currentEntries = [...(previousTranscripts[sessionId] ?? [])]
  const currentIndex = currentEntries.findIndex(
    (entry) => entry.type === "tool" && entry.approvalId === approvalId
  )

  if (currentIndex < 0) {
    return previousTranscripts
  }

  const currentEntry = currentEntries[currentIndex]
  if (currentEntry?.type !== "tool") {
    return previousTranscripts
  }

  currentEntries[currentIndex] = update(currentEntry)
  return {
    ...previousTranscripts,
    [sessionId]: currentEntries,
  }
}

import type {
  CubiclesChatEvent,
  CubiclesSessionResponse,
  CubiclesPendingApproval,
  CubiclesSessionHistoryMessage,
} from "@/lib/cubicles-api/types"
import type { CubiclesBackendState } from "@/lib/tauri/cubicles-backend"
import type { SessionSummary, ToolCategory, ToolStatus, TranscriptEntry } from "@/lib/types"

type ToolEvent = Extract<
  CubiclesChatEvent,
  { type: "tool_call" | "tool_running" | "tool_result" | "awaiting_approval" | "tool_skipped" }
>
type ToolEntry = Extract<TranscriptEntry, { type: "tool" }>
export type Transcripts = Record<string, TranscriptEntry[]>

const GENERIC_TOOL_DETAILS = new Set(["", "Tool execution update", "Running..."])

function firstMeaningfulLine(value: string | undefined): string | null {
  if (!value) return null
  return value
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? null
}

export function inferToolCategory(toolName: string): ToolCategory {
  if (toolName === "bash") return "command"
  if (toolName === "python") return "script"
  if (
    toolName.includes("file") ||
    toolName.includes("dir") ||
    toolName === "glob" ||
    toolName === "rg"
  ) {
    return "file"
  }
  if (toolName.startsWith("memory")) return "memory"
  if (toolName.includes("session") || toolName === "workspace") return "session"
  if (toolName.startsWith("api") || toolName.includes("extension") || toolName.includes("skill")) {
    return "reference"
  }
  return "tool"
}

export function formatToolCategory(category: ToolCategory): string {
  switch (category) {
    case "command":
      return "command"
    case "script":
      return "script"
    case "file":
      return "file tool"
    case "memory":
      return "memory"
    case "session":
      return "session"
    case "reference":
      return "integration"
    default:
      return "tool"
  }
}

function formatToolPayload(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2)
}

function buildToolCommandText(toolName: string, detail: string, payload?: Record<string, unknown>): string {
  if (payload) {
    if (toolName === "bash") {
      return `bash ${String(payload.command ?? "").trim()}`.trim()
    }
    if (toolName === "python") {
      const firstLine = String(payload.code ?? "").split("\n")[0]?.trim() ?? ""
      return `python ${firstLine}`.trim()
    }
  }

  const cleanDetail = detail.trim()
  return cleanDetail ? `${toolName} ${cleanDetail}` : toolName
}

function buildToolStatusMessage({
  name,
  category,
  status,
  detail,
  output,
  returnCode,
}: {
  name: string
  category: ToolCategory
  status: ToolStatus
  detail: string
  output?: string
  returnCode?: number
}): string {
  const action = category === "command" ? `command \`${name}\`` : `\`${name}\``
  if (status === "running") {
    return !GENERIC_TOOL_DETAILS.has(detail.trim()) ? detail : `Running ${action}…`
  }
  if (status === "awaiting-approval") {
    return `Waiting for approval to run ${action}.`
  }
  if (output === "Tool execution was skipped.") {
    return `Skipped ${action}.`
  }
  if (returnCode != null && returnCode !== 0) {
    const line = firstMeaningfulLine(output)
    return line
      ? `${action} failed with exit code ${returnCode}. ${line}`
      : `${action} failed with exit code ${returnCode}.`
  }

  const line = firstMeaningfulLine(output)
  return line ? `Completed ${action}. ${line}` : `Completed ${action}.`
}

function toolEntryId(sessionId: string, streamId: string, toolName: string) {
  return `tool-${sessionId}-${streamId}-${toolName}`
}

export function formatTimestamp(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function buildSessionTitle(totalSessions: number) {
  return `New workspace thread ${totalSessions + 1}`
}

export function buildVisibleSessions(
  backendState: CubiclesBackendState,
  localSessions: SessionSummary[],
  remoteSessions: CubiclesSessionResponse[] | undefined,
  pendingApproval: CubiclesPendingApproval | undefined
): SessionSummary[] {
  if (backendState.mode !== "ready") {
    return localSessions
  }

  return (remoteSessions ?? []).map<SessionSummary>((session) => ({
    id: session.id,
    title: session.name,
    workspace: session.workspace_name,
    preview: session.is_active
      ? "Active Cubicles session"
      : "Synced from the local Cubicles server.",
    updatedAtLabel: new Date(session.updated_at).toLocaleString(),
    status: session.is_active ? "live" : "ready",
    hasPendingApproval:
      pendingApproval?.approvalId != null && pendingApproval.sessionId === session.id,
  }))
}

export function resolvePreferredSessionId(
  selectedSessionId: string,
  remoteSessions: CubiclesSessionResponse[],
  activeSessionId?: string | null
): string {
  if (selectedSessionId && remoteSessions.some((session) => session.id === selectedSessionId)) {
    return selectedSessionId
  }

  return (
    activeSessionId ??
    remoteSessions.find((session) => session.is_active)?.id ??
    remoteSessions[0]?.id ??
    ""
  )
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

/**
 * Parse a persisted "tool" message into a structured ToolEntry for history display.
 *
 * Persisted format examples:
 *   "requested (awaiting approval): python\npython: import openpyxl ..."
 *   "requested: bash\nbash ls -la"
 *   "result: python (exit=0)\nCreated: /path/to/file.xlsx"
 *   "skipped: bash"
 *   "redirected: python\nUser said: ..."
 */
function parseHistoryToolMessage(
  content: string,
  id: string,
  timestamp: string
): Extract<TranscriptEntry, { type: "tool" }> | null {
  const lines = content.split("\n")
  const header = lines[0] ?? ""
  const body = lines.slice(1).join("\n").trim()

  let name = "tool"
  let status: "running" | "awaiting-approval" | "completed" = "completed"
  let detail = ""
  let output: string | undefined
  let returnCode: number | undefined

  const resultMatch = header.match(/^result:\s*(\S+)\s*\(exit=(-?\d+)\)/)
  const requestedMatch = header.match(/^requested(?:\s*\(awaiting approval\))?:\s*(\S+)/)
  const skippedMatch = header.match(/^skipped:\s*(\S+)/)
  const redirectedMatch = header.match(/^redirected:\s*(\S+)/)

  if (resultMatch) {
    name = resultMatch[1]
    returnCode = Number(resultMatch[2])
    output = body || undefined
    status = "completed"
  } else if (requestedMatch) {
    name = requestedMatch[1]
    detail = body || header
    status = header.includes("awaiting approval") ? "awaiting-approval" : "running"
  } else if (skippedMatch) {
    name = skippedMatch[1]
    output = "Tool execution was skipped."
    status = "completed"
  } else if (redirectedMatch) {
    name = redirectedMatch[1]
    output = body || "Redirected with user guidance."
    status = "completed"
  } else {
    return null
  }

  const category = inferToolCategory(name)
  return {
    id,
    type: "tool",
    name,
    category,
    status,
    commandText: buildToolCommandText(name, detail),
    statusMessage: buildToolStatusMessage({ name, category, status, detail, output, returnCode }),
    detail,
    output,
    returnCode,
    timestamp,
  }
}

export function mapHistoryToTranscript(
  history: CubiclesSessionHistoryMessage[] | undefined
): TranscriptEntry[] | null {
  if (!history?.length) return null

  // Merge consecutive tool messages for the same tool into a single entry.
  // The backend persists "requested: toolName" and "result: toolName (exit=N)" as
  // separate rows. We want one ToolEntry per tool invocation, so when a "result"
  // message immediately follows a "requested" message for the same tool, fold
  // the result into the earlier entry instead of emitting two cards.
  const entries: TranscriptEntry[] = []

  for (const message of history) {
    const id = `history-${message.created_at}-${crypto.randomUUID()}`
    const timestamp = formatTimestamp(message.created_at)
    const { role, content } = message

    if (role === "slash_command" || role === "slash_result") {
      entries.push({ id, type: "slash", variant: role === "slash_command" ? "command" : "result", content, timestamp })
      continue
    }
    if (role === "thinking") {
      // Buffer thinking; will be merged with the following assistant message
      entries.push({ id, type: "message", role: "assistant", content: `<think>${content}</think>`, timestamp })
      continue
    }
    if (role === "assistant") {
      // Merge with a preceding thinking entry into a single record
      const prev = entries[entries.length - 1]
      if (prev?.type === "message" && prev.role === "assistant" && prev.content.startsWith("<think>")) {
        entries[entries.length - 1] = { ...prev, content: `${prev.content}${content}` }
      } else {
        entries.push({ id, type: "message", role: "assistant", content, timestamp })
      }
      continue
    }
    if (role === "user") {
      entries.push({ id, type: "message", role, content, timestamp })
      continue
    }
    if (role === "tool") {
      const toolEntry = parseHistoryToolMessage(content, id, timestamp)
      if (toolEntry) {
        // Merge result into a preceding "requested" entry for the same tool
        if (toolEntry.status === "completed" && toolEntry.returnCode !== undefined) {
          const prev = entries[entries.length - 1]
          if (
            prev?.type === "tool" &&
            prev.name === toolEntry.name &&
            prev.status !== "completed"
          ) {
            entries[entries.length - 1] = {
              ...prev,
              status: "completed",
              statusMessage: toolEntry.statusMessage,
              output: toolEntry.output,
              returnCode: toolEntry.returnCode,
            }
            continue
          }
        }
        entries.push(toolEntry)
      } else {
        entries.push({ id, type: "system", label: role, content, timestamp })
      }
      continue
    }
    // Skip audit/error/system messages that clutter the history view
    if (role === "error") {
      entries.push({ id, type: "system", label: "Error", content, timestamp })
      continue
    }
    // Other roles (audit, etc.) — skip silently in the transcript
  }

  return entries
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

  const category = inferToolCategory(toolName)
  const argumentsText =
    event.type === "tool_call"
      ? formatToolPayload(event.tool)
      : event.type === "awaiting_approval"
        ? formatToolPayload(event.pendingTool)
        : undefined
  const output =
    event.type === "tool_result"
      ? event.output
      : event.type === "tool_skipped"
        ? "Tool execution was skipped."
        : undefined
  const commandText =
    event.type === "tool_call"
      ? buildToolCommandText(toolName, detail, event.tool)
      : event.type === "awaiting_approval"
        ? buildToolCommandText(toolName, detail, event.pendingTool)
        : buildToolCommandText(toolName, detail)
  const returnCode = event.type === "tool_result" ? event.returncode : event.type === "tool_skipped" ? 0 : undefined

  return {
    id: toolEntryId(sessionId, streamId, toolName),
    type: "tool",
    name: toolName,
    category,
    status,
    commandText,
    statusMessage: buildToolStatusMessage({
      name: toolName,
      category,
      status,
      detail,
      output,
      returnCode,
    }),
    detail,
    argumentsText,
    output,
    returnCode,
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

export function buildToolPreviewEntry(sessionId: string, streamId: string, content: string): Extract<TranscriptEntry, { type: "tool-preview" }> {
  return {
    id: buildToolPreviewEntryId(sessionId, streamId),
    type: "tool-preview",
    timestamp: "Now",
    content,
    commandText: firstMeaningfulLine(content) ?? "Tool preview",
  }
}

export function buildPendingApprovalToolEntry(
  sessionId: string,
  pending: CubiclesPendingApproval
): ToolEntry {
  const toolName = String(pending.pendingTool.name ?? "tool")
  const category = inferToolCategory(toolName)
  const detail = "Waiting for user approval before execution."
  return {
    id: `tool-${sessionId}-pending-${toolName}`,
    type: "tool",
    name: toolName,
    category,
    status: "awaiting-approval",
    commandText: buildToolCommandText(toolName, detail, pending.pendingTool),
    statusMessage: buildToolStatusMessage({
      name: toolName,
      category,
      status: "awaiting-approval",
      detail,
    }),
    detail,
    argumentsText: formatToolPayload(pending.pendingTool),
    timestamp: "Now",
    approvalId: pending.approvalId,
  }
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

function findOpenToolEntryIndex(entries: TranscriptEntry[], entry: ToolEntry) {
  if (entry.approvalId) {
    const approvalMatchIndex = entries.findIndex(
      (candidate) =>
        candidate.type === "tool" &&
        candidate.approvalId === entry.approvalId
    )
    if (approvalMatchIndex >= 0) {
      return approvalMatchIndex
    }
  }

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const candidate = entries[index]
    if (
      candidate?.type === "tool" &&
      candidate.name === entry.name &&
      candidate.status !== "completed"
    ) {
      return index
    }
  }

  return -1
}

export function upsertToolEntry(
  prev: Transcripts,
  sessionId: string,
  entry: ToolEntry
): Transcripts {
  const entries = [...(prev[sessionId] ?? [])]
  const existingIndex = findOpenToolEntryIndex(entries, entry)

  if (existingIndex < 0) {
    entries.push(entry)
    return { ...prev, [sessionId]: entries }
  }

  const currentEntry = entries[existingIndex]
  if (currentEntry?.type !== "tool") {
    entries.push(entry)
    return { ...prev, [sessionId]: entries }
  }

  entries[existingIndex] = {
    ...currentEntry,
    ...entry,
    id: currentEntry.id,
    approvalId: entry.approvalId ?? currentEntry.approvalId,
    argumentsText: entry.argumentsText ?? currentEntry.argumentsText,
    output: entry.output ?? currentEntry.output,
    returnCode: entry.returnCode ?? currentEntry.returnCode,
    step: entry.step ?? currentEntry.step,
    maxSteps: entry.maxSteps ?? currentEntry.maxSteps,
  }

  return { ...prev, [sessionId]: entries }
}

export function syncPendingApprovalEntry(
  prev: Transcripts,
  sessionId: string,
  pending: CubiclesPendingApproval | null
): Transcripts {
  if (!pending) {
    const entries = (prev[sessionId] ?? []).filter(
      (entry) => entry.type !== "tool" || entry.status !== "awaiting-approval"
    )

    return entries.length === (prev[sessionId] ?? []).length
      ? prev
      : { ...prev, [sessionId]: entries }
  }

  return upsertToolEntry(prev, sessionId, buildPendingApprovalToolEntry(sessionId, pending))
}

export function replaceTranscriptFromHistory(
  prev: Transcripts,
  sessionId: string,
  historyEntries: TranscriptEntry[] | null,
  /** When true, skip replacement if the session already has live stream entries. */
  skipIfFresh = false
): Transcripts {
  const existing = prev[sessionId] ?? []

  // If the transcript already carries live-stream entries, keep them as-is
  // to avoid the flash caused by rebuilding every DOM node from history data.
  if (skipIfFresh && existing.some((e) => e.id.startsWith("assistant-live-") || e.id.startsWith("tool-"))) {
    return prev
  }

  const baseEntries = historyEntries ?? []
  const preservedEntries = existing.filter((entry) => {
    if (entry.type === "tool-preview" || entry.type === "turn-summary") {
      return true
    }
    if (entry.type === "tool") {
      return entry.status !== "completed"
    }
    return false
  })

  return {
    ...prev,
    [sessionId]: [...baseEntries, ...preservedEntries],
  }
}

export type StreamRuntimeState = { thinkingOpen: boolean }

export type StreamReduction = {
  transcripts: Transcripts
  selectedSessionId?: string
  workingLabel?: string | null
  liveUsage?: { total?: number; contextUsedTokens?: number; promptBudget?: number } | null
  clearStreamState?: boolean
}

function appendAssistantStreamContent(
  previousTranscripts: Transcripts,
  sessionId: string,
  streamId: string,
  content: string
) {
  const entryId = buildAssistantStreamEntryId(sessionId, streamId)

  return upsertEntry(previousTranscripts, sessionId, entryId, (currentEntry) => ({
    id: entryId,
    type: "message",
    role: "assistant",
    timestamp: "Now",
    content:
      currentEntry?.type === "message"
        ? `${currentEntry.content}${content}`
        : content,
  }))
}

function closeThinkingBlock(
  previousTranscripts: Transcripts,
  sessionId: string,
  streamId: string,
  streamStates: Record<string, StreamRuntimeState>
) {
  const streamState = streamStates[streamId]
  if (!streamState?.thinkingOpen) {
    return previousTranscripts
  }

  streamState.thinkingOpen = false
  return appendAssistantStreamContent(previousTranscripts, sessionId, streamId, "</think>")
}

export function reduceStreamEvent(
  previousTranscripts: Transcripts,
  sessionId: string,
  streamId: string,
  event: CubiclesChatEvent,
  streamStates: Record<string, StreamRuntimeState>
): StreamReduction {
  switch (event.type) {
    case "session_context":
      return {
        transcripts: previousTranscripts,
        selectedSessionId: event.sessionId,
      }
    case "assistant_delta":
      return {
        transcripts: appendAssistantStreamContent(
          closeThinkingBlock(previousTranscripts, sessionId, streamId, streamStates),
          sessionId,
          streamId,
          event.delta
        ),
        workingLabel: null,
      }
    case "thinking_delta": {
      const streamState = streamStates[streamId] ?? { thinkingOpen: false }
      streamStates[streamId] = streamState
      let nextTranscripts = previousTranscripts

      if (!streamState.thinkingOpen) {
        streamState.thinkingOpen = true
        nextTranscripts = appendAssistantStreamContent(nextTranscripts, sessionId, streamId, "<think>")
      }

      return {
        transcripts: appendAssistantStreamContent(nextTranscripts, sessionId, streamId, event.delta),
      }
    }
    case "tool_preview": {
      const previewEntry = buildToolPreviewEntry(sessionId, streamId, event.content)
      return {
        transcripts: upsertEntry(previousTranscripts, sessionId, previewEntry.id, () => previewEntry),
        workingLabel: "Generating tool call…",
      }
    }
    case "tool_call":
    case "tool_running":
    case "awaiting_approval":
    case "tool_result":
    case "tool_skipped": {
      const entry = buildToolEntry(event, sessionId, streamId)
      const resumesLoop = event.type === "tool_result" || event.type === "tool_skipped"
      return {
        transcripts: upsertToolEntry(
          removeEntry(previousTranscripts, sessionId, buildToolPreviewEntryId(sessionId, streamId)),
          sessionId,
          entry
        ),
        workingLabel: resumesLoop ? "Analysing result…" : null,
      }
    }
    case "approval_applied":
      return {
        transcripts: setToolEntryByApprovalId(previousTranscripts, sessionId, event.approvalId, (entry) => ({
          ...entry,
          status: event.approved ? "running" : "completed",
          statusMessage: event.approved
            ? "Approval granted. Running tool…"
            : "Approval rejected. Tool execution was skipped.",
          detail: event.approved
            ? "Approval granted. Resuming tool execution."
            : "Approval rejected. Tool execution was skipped.",
          output: event.approved ? entry.output : "Tool execution was skipped.",
          returnCode: event.approved ? entry.returnCode : 0,
        })),
      }
    case "usage":
      return {
        transcripts: previousTranscripts,
        liveUsage: event.usage as { total?: number; contextUsedTokens?: number; promptBudget?: number },
      }
    case "compressing": {
      const entryId = `compressing-${sessionId}-${streamId}`
      return {
        transcripts: upsertEntry(previousTranscripts, sessionId, entryId, () => ({
          id: entryId,
          type: "system",
          label: "Context",
          timestamp: "Now",
          content: "Compressing context to stay within token budget…",
        })),
      }
    }
    case "turn_summary": {
      const entryId = `turn-summary-${sessionId}-${streamId}`
      return {
        transcripts: upsertEntry(previousTranscripts, sessionId, entryId, () => ({
          id: entryId,
          type: "turn-summary",
          steps: event.steps,
          toolsCalled: event.toolsCalled,
          tokensUsed: event.tokensUsed,
          errorCount: event.errorCount,
          timestamp: "Now",
        })),
      }
    }
    case "error":
      return {
        transcripts: appendEntry(
          removeEntry(
            closeThinkingBlock(previousTranscripts, sessionId, streamId, streamStates),
            sessionId,
            buildToolPreviewEntryId(sessionId, streamId)
          ),
          sessionId,
          buildSystemEntry("Error", event.message)
        ),
        workingLabel: null,
        clearStreamState: true,
      }
    case "done":
      return {
        transcripts: removeEntry(
          closeThinkingBlock(previousTranscripts, sessionId, streamId, streamStates),
          sessionId,
          buildToolPreviewEntryId(sessionId, streamId)
        ),
        workingLabel: null,
        liveUsage: null,
        clearStreamState: true,
      }
  }
}

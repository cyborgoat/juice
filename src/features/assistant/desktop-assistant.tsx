import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PanelLeft } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  activateCubiclesSession,
  createCubiclesSession,
  fetchCubiclesSessionHistory,
  fetchCubiclesProfiles,
  fetchCubiclesSessions,
  fetchCubiclesSettings,
  streamCubiclesChat,
} from "@/lib/cubicles-api/client"
import type {
  CubiclesChatEvent,
  CubiclesSessionHistoryMessage,
} from "@/lib/cubicles-api/types"
import { type CubiclesBackendState, ensureCubiclesBackend } from "@/lib/tauri/cubicles-backend"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatTranscript } from "@/components/chat/chat-transcript"
import { SessionSidebar } from "@/components/sessions/session-sidebar"
import { Button } from "@/components/ui/button"
import {
  demoSessions,
  demoTranscripts,
  type SessionSummary,
  type TranscriptEntry,
} from "@/lib/demo-data"
import { cn } from "@/lib/utils"

function formatTimestamp(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildSessionTitle(totalSessions: number) {
  return `New workspace thread ${totalSessions + 1}`
}

function buildAssistantFallbackResponse(input: string): TranscriptEntry {
  return {
    id: `assistant-${crypto.randomUUID()}`,
    type: "message",
    role: "assistant",
    timestamp: "Just now",
    content: `Foundation mode heard: “${input}”. The next implementation pass will replace this local response with real Cubicles chat streaming, approvals, and persisted session history.`,
  }
}

function buildLiveSessionPlaceholder(session: SessionSummary): TranscriptEntry[] {
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

function buildBackendBadgeLabel(backendState: CubiclesBackendState) {
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

function buildBackendTooltipContent(backendState: CubiclesBackendState) {
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

function mapHistoryToTranscript(
  history: CubiclesSessionHistoryMessage[] | undefined
): TranscriptEntry[] | null {
  if (!history?.length) {
    return null
  }

  return history.map((message) => {
    const timestamp = formatTimestamp(message.created_at)

    if (message.role === "assistant" || message.role === "user") {
      return {
        id: `history-${message.created_at}-${crypto.randomUUID()}`,
        type: "message",
        role: message.role,
        content: message.content,
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

function appendEntry(
  previousTranscripts: Record<string, TranscriptEntry[]>,
  sessionId: string,
  entry: TranscriptEntry
) {
  return {
    ...previousTranscripts,
    [sessionId]: [...(previousTranscripts[sessionId] ?? []), entry],
  }
}

function upsertEntry(
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

function buildAssistantStreamEntryId(sessionId: string, streamId: string) {
  return `assistant-live-${sessionId}-${streamId}`
}

export function DesktopAssistant() {
  const queryClient = useQueryClient()
  const [localSessions, setLocalSessions] = useState<SessionSummary[]>(demoSessions)
  const [selectedSessionId, setSelectedSessionId] = useState(demoSessions[0]?.id ?? "")
  const [transcripts, setTranscripts] =
    useState<Record<string, TranscriptEntry[]>>(demoTranscripts)
  const [backendState, setBackendState] = useState<CubiclesBackendState>({
    mode: "starting",
    apiBase: "http://127.0.0.1:7799/api",
    detail: "Starting Cubicles desktop integration...",
    pid: null,
  })
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const liveStreamStateRef = useRef<Record<string, { thinkingOpen: boolean }>>({})

  useEffect(() => {
    let isMounted = true

    void ensureCubiclesBackend().then((state) => {
      if (isMounted) {
        setBackendState(state)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const settingsQuery = useQuery({
    queryKey: ["cubicles", "settings"],
    queryFn: fetchCubiclesSettings,
    enabled: backendState.mode === "ready",
  })

  const sessionsQuery = useQuery({
    queryKey: ["cubicles", "sessions"],
    queryFn: fetchCubiclesSessions,
    enabled: backendState.mode === "ready",
  })

  const profilesQuery = useQuery({
    queryKey: ["cubicles", "profiles"],
    queryFn: fetchCubiclesProfiles,
    enabled: backendState.mode === "ready",
  })

  const remoteSessionIds = useMemo(
    () => new Set(sessionsQuery.data?.map((session) => session.id) ?? []),
    [sessionsQuery.data]
  )

  const visibleSessions = useMemo(() => {
    if (!sessionsQuery.data?.length) {
      return localSessions
    }

    return sessionsQuery.data.map<SessionSummary>((session) => ({
      id: session.id,
      title: session.name,
      workspace: session.workspace_name,
      preview: session.is_active
        ? "Active Cubicles session"
        : "Synced from the local Cubicles server.",
      updatedAtLabel: new Date(session.updated_at).toLocaleString(),
      messageCount: session.message_count,
      status: session.is_active ? "live" : "ready",
    }))
  }, [localSessions, sessionsQuery.data])

  const activeSession = useMemo(
    () =>
      visibleSessions.find((session) => session.id === selectedSessionId) ??
      visibleSessions[0],
    [selectedSessionId, visibleSessions]
  )

  const sessionHistoryQuery = useQuery({
    queryKey: ["cubicles", "session-history", activeSession?.id],
    queryFn: () => fetchCubiclesSessionHistory(activeSession!.id),
    enabled:
      backendState.mode === "ready" &&
      Boolean(activeSession?.id) &&
      remoteSessionIds.has(activeSession.id),
  })

  const fallbackHistoryEntries = useMemo(
    () => mapHistoryToTranscript(sessionHistoryQuery.data),
    [sessionHistoryQuery.data]
  )

  const activeEntries = activeSession
    ? transcripts[activeSession.id] ??
      fallbackHistoryEntries ??
      buildLiveSessionPlaceholder(activeSession)
    : []

  async function handleCreateSession() {
    if (backendState.mode === "ready") {
      const createdSession = await createCubiclesSession(
        buildSessionTitle(visibleSessions.length)
      )
      setSelectedSessionId(createdSession.id)
      await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })
      return
    }

    const id = crypto.randomUUID()
    const title = buildSessionTitle(localSessions.length)
    const session: SessionSummary = {
      id,
      title,
      workspace: "juice",
      preview: "Fresh session ready for Cubicles-backed chat wiring.",
      updatedAtLabel: "Just now",
      messageCount: 1,
      status: "ready",
    }

    setLocalSessions((previousSessions) => [session, ...previousSessions])
    setTranscripts((previousTranscripts) => ({
      ...previousTranscripts,
      [id]: [
        {
          id: `system-${id}`,
          type: "system",
          label: "New session",
          content:
            "This placeholder session is ready for the next phase, where Juice will create and activate real Cubicles sessions through the local desktop backend.",
          timestamp: "Just now",
        },
      ],
    }))
    setSelectedSessionId(id)
  }

  async function handleSelectSession(sessionId: string) {
    setSelectedSessionId(sessionId)

    if (backendState.mode === "ready" && remoteSessionIds.has(sessionId)) {
      await activateCubiclesSession(sessionId)
      await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })
    }
  }

  async function resolveRemoteSessionId(session: SessionSummary) {
    if (remoteSessionIds.has(session.id)) {
      return session.id
    }

    const createdSession = await createCubiclesSession(session.title)
    setTranscripts((previousTranscripts) => {
      const nextTranscripts = { ...previousTranscripts }
      const existingEntries = nextTranscripts[session.id]
      if (existingEntries) {
        delete nextTranscripts[session.id]
        nextTranscripts[createdSession.id] = existingEntries
      }

      return nextTranscripts
    })
    setSelectedSessionId(createdSession.id)
    await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })

    return createdSession.id
  }

  function appendAssistantStreamContent(
    previousTranscripts: Record<string, TranscriptEntry[]>,
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
    previousTranscripts: Record<string, TranscriptEntry[]>,
    sessionId: string,
    streamId: string
  ) {
    const streamState = liveStreamStateRef.current[streamId]
    if (!streamState?.thinkingOpen) {
      return previousTranscripts
    }

    streamState.thinkingOpen = false
    return appendAssistantStreamContent(previousTranscripts, sessionId, streamId, "</think>")
  }

  function applyChatEvent(sessionId: string, streamId: string, event: CubiclesChatEvent) {
    switch (event.type) {
      case "session_context": {
        setSelectedSessionId(event.sessionId)
        return
      }
      case "assistant_delta": {
        setTranscripts((previousTranscripts) =>
          appendAssistantStreamContent(
            closeThinkingBlock(previousTranscripts, sessionId, streamId),
            sessionId,
            streamId,
            event.delta
          )
        )
        return
      }
      case "thinking_delta": {
        const streamState = liveStreamStateRef.current[streamId] ?? { thinkingOpen: false }
        liveStreamStateRef.current[streamId] = streamState

        setTranscripts((previousTranscripts) => {
          let nextTranscripts = previousTranscripts

          if (!streamState.thinkingOpen) {
            streamState.thinkingOpen = true
            nextTranscripts = appendAssistantStreamContent(
              nextTranscripts,
              sessionId,
              streamId,
              "<think>"
            )
          }

          return appendAssistantStreamContent(nextTranscripts, sessionId, streamId, event.delta)
        })
        return
      }
      case "tool_preview": {
        const entryId = `tool-preview-${sessionId}-${streamId}`
        setTranscripts((previousTranscripts) =>
          upsertEntry(previousTranscripts, sessionId, entryId, () => ({
            id: entryId,
            type: "system",
            label: "Tool preview",
            timestamp: "Now",
            content: event.content,
          }))
        )
        return
      }
      case "tool_call":
      case "tool_running":
      case "tool_result":
      case "awaiting_approval":
      case "tool_skipped": {
        const toolName =
          event.type === "tool_result" || event.type === "tool_running" || event.type === "tool_skipped"
            ? event.name
            : event.type === "tool_call"
              ? String(event.tool.name ?? "tool")
              : String(event.pendingTool.name ?? "tool")
        const entryId = `tool-${sessionId}-${streamId}-${toolName}`
        setTranscripts((previousTranscripts) =>
          upsertEntry(previousTranscripts, sessionId, entryId, () => ({
            id: entryId,
            type: "tool",
            name: toolName,
            status:
              event.type === "tool_result"
                ? "completed"
                : event.type === "awaiting_approval"
                  ? "awaiting-approval"
                  : "running",
            detail:
              event.type === "tool_call"
                ? event.detail
                : event.type === "tool_running"
                  ? event.detail
                  : event.type === "awaiting_approval"
                    ? "Waiting for user approval before execution."
                    : "Tool execution update",
            output:
              event.type === "tool_result"
                ? event.output
                : event.type === "tool_skipped"
                  ? "Tool execution was skipped."
                  : event.type === "tool_call"
                    ? JSON.stringify(event.tool, null, 2)
                    : event.type === "awaiting_approval"
                      ? JSON.stringify(event.pendingTool, null, 2)
                      : "Running...",
            timestamp: "Now",
          }))
        )
        return
      }
      case "approval_applied":
      case "usage": {
        return
      }
      case "error": {
        setTranscripts((previousTranscripts) =>
          closeThinkingBlock(previousTranscripts, sessionId, streamId)
        )
        const entryId = `error-${sessionId}-${crypto.randomUUID()}`
        setTranscripts((previousTranscripts) =>
          appendEntry(previousTranscripts, sessionId, {
            id: entryId,
            type: "system",
            label: "Error",
            timestamp: "Now",
            content: event.message,
          })
        )
        delete liveStreamStateRef.current[streamId]
        return
      }
      case "done": {
        setTranscripts((previousTranscripts) =>
          closeThinkingBlock(previousTranscripts, sessionId, streamId)
        )
        delete liveStreamStateRef.current[streamId]
        return
      }
    }
  }

  async function handleSendMessage(value: string) {
    if (!activeSession || isStreaming) {
      return
    }

    if (backendState.mode !== "ready") {
      const userEntry: TranscriptEntry = {
        id: `user-${crypto.randomUUID()}`,
        type: "message",
        role: "user",
        content: value,
        timestamp: "Just now",
      }
      const assistantEntry = buildAssistantFallbackResponse(value)

      setTranscripts((previousTranscripts) => ({
        ...previousTranscripts,
        [activeSession.id]: [
          ...(previousTranscripts[activeSession.id] ?? []),
          userEntry,
          assistantEntry,
        ],
      }))
      return
    }

    setIsStreaming(true)

    const sessionId = await resolveRemoteSessionId(activeSession)
    const streamId = crypto.randomUUID()
    liveStreamStateRef.current[streamId] = { thinkingOpen: false }
    const userEntry: TranscriptEntry = {
      id: `user-${crypto.randomUUID()}`,
      type: "message",
      role: "user",
      content: value,
      timestamp: "Now",
    }

    setTranscripts((previousTranscripts) =>
      appendEntry(previousTranscripts, sessionId, userEntry)
    )

    try {
      const profileName =
        settingsQuery.data?.default_profile ?? profilesQuery.data?.[0]?.name ?? null

      if (!profileName) {
        throw new Error("No usable Cubicles profile is available yet. Configure one in profiles/settings first.")
      }

      for await (const event of streamCubiclesChat({
        message: value,
        session_id: sessionId,
        profile_name: profileName,
      })) {
        applyChatEvent(sessionId, streamId, event)
      }
    } catch (error) {
      setTranscripts((previousTranscripts) =>
        closeThinkingBlock(previousTranscripts, sessionId, streamId)
      )
      delete liveStreamStateRef.current[streamId]
      const entryId = `error-${crypto.randomUUID()}`
      setTranscripts((previousTranscripts) =>
        appendEntry(previousTranscripts, sessionId, {
          id: entryId,
          type: "system",
          label: "Error",
          timestamp: "Now",
          content: error instanceof Error ? error.message : String(error),
        })
      )
    } finally {
      setIsStreaming(false)
      await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })
      await queryClient.invalidateQueries({
        queryKey: ["cubicles", "session-history", sessionId],
      })
    }
  }

  if (!activeSession) {
    return null
  }

  const contentWidthClass = "max-w-6xl"

  return (
    <div className="dark h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_26%)]" />

      <div className="relative flex h-screen overflow-hidden">
        {isSidebarOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar drawer"
          />
        ) : null}
        <SessionSidebar
          sessions={visibleSessions}
          selectedSessionId={activeSession.id}
          isOpen={isSidebarOpen}
          onSelectSession={(sessionId) => {
            void handleSelectSession(sessionId)
          }}
          onCreateSession={() => {
            void handleCreateSession()
          }}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-border/70 bg-background/70 px-4 py-2 backdrop-blur-xl md:px-6">
            <div className={cn("mx-auto flex w-full items-center justify-between gap-4", contentWidthClass)}>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={() => setIsSidebarOpen((open) => !open)}
                  >
                    <PanelLeft className="size-4" />
                    <span className="sr-only">
                      {isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    </span>
                  </Button>
                  <h2 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                    {activeSession.title}
                  </h2>
                  <div className="group/status relative flex shrink-0 items-center">
                    <button
                      type="button"
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                      aria-label={buildBackendBadgeLabel(backendState)}
                    >
                      <span
                        className={cn(
                          "block size-2.5 rounded-full",
                          backendState.mode === "ready"
                            ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]"
                            : backendState.mode === "error"
                              ? "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
                              : "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
                        )}
                      >
                        <span className="sr-only">{buildBackendBadgeLabel(backendState)}</span>
                      </span>
                    </button>
                    <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 w-72 -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg backdrop-blur transition-opacity duration-150 group-hover/status:opacity-100 group-focus-within/status:opacity-100">
                      {buildBackendTooltipContent(backendState)}
                    </div>
                  </div>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {activeSession.workspace}
                </p>
              </div>

            </div>
          </header>

          <div className="min-h-0 flex-1">
            <section className="flex h-full min-h-0 min-w-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
                <div className={cn("mx-auto w-full", contentWidthClass)}>
                  <ChatTranscript entries={activeEntries} />
                </div>
              </div>

              <div className="sticky bottom-0 shrink-0 border-t border-border/70 bg-background/88 px-3 py-3 backdrop-blur md:px-4">
                <div className={cn("mx-auto w-full", contentWidthClass)}>
                  <ChatComposer
                    onSubmit={(value) => {
                      void handleSendMessage(value)
                    }}
                    disabled={backendState.mode === "error"}
                    isStreaming={isStreaming}
                  />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

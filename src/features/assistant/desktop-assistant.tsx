import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, MessageSquarePlus, Moon, PanelLeft, Settings2, Sun, Trash2, XCircle } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "@/hooks/use-theme"
import { toast } from "sonner"

import {
  activateCubiclesSession,
  createCubiclesSession,
  deleteCubiclesSession,
  executeCubiclesSlashCommand,
  fetchCubiclesPendingApproval,
  fetchCubiclesSessionHistory,
  fetchCubiclesProfiles,
  fetchCubiclesSessions,
  fetchCubiclesSettings,
  fetchCubiclesSlashCommands,
  stopCubiclesChat,
  streamCubiclesChat,
} from "@/lib/cubicles-api/client"
import type {
  CubiclesChatEvent,
  CubiclesChatStreamRequest,
} from "@/lib/cubicles-api/types"
import { type CubiclesBackendState, ensureCubiclesBackend } from "@/lib/tauri/cubicles-backend"
import { CommandPalette, type CommandPaletteAction } from "@/components/command-palette"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatTranscript } from "@/components/chat/chat-transcript"
import { SessionSidebar } from "@/components/sessions/session-sidebar"
import { Button } from "@/components/ui/button"
import { SettingsScreen, type SettingsTab } from "@/features/settings/settings-screen"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { type SessionSummary, type TranscriptEntry } from "@/lib/demo-data"
import { createLogger } from "@/lib/logger"
import { transcriptToMarkdown, saveToDownloads } from "@/lib/transcript-export"
import { cn } from "@/lib/utils"
import {
  appendEntry,
  buildAssistantFallbackResponse,
  buildAssistantStreamEntryId,
  buildBackendBadgeLabel,
  buildBackendTooltipContent,
  buildLiveSessionPlaceholder,
  buildSessionTitle,
  buildToolPreviewEntryId,
  mapHistoryToTranscript,
  removeEntry,
  setToolEntryByApprovalId,
  upsertEntry,
} from "./transcript-helpers"

function HeaderMetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background/55 px-2 py-1 text-[11px] leading-none text-muted-foreground">
      <span className="shrink-0 uppercase tracking-[0.16em] text-foreground/75">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  )
}

const logger = createLogger("desktop-assistant")


export function DesktopAssistant() {
  const queryClient = useQueryClient()
  const [localSessions, setLocalSessions] = useState<SessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptEntry[]>>({})
  const [backendState, setBackendState] = useState<CubiclesBackendState>({
    mode: "starting",
    apiBase: "http://127.0.0.1:7799/api",
    detail: "Starting Cubicles desktop integration...",
    pid: null,
  })
  const { theme, toggleTheme } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState<"chat" | "settings">("chat")
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("overview")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isMutatingSession, setIsMutatingSession] = useState(false)
  const [deleteCandidateSessionId, setDeleteCandidateSessionId] = useState<string | null>(null)
  const [showWorkingIndicator, setShowWorkingIndicator] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const liveStreamStateRef = useRef<Record<string, { thinkingOpen: boolean }>>({})
  const activeStreamAbortRef = useRef<AbortController | null>(null)
  const activeStreamSessionIdRef = useRef<string | null>(null)
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let isMounted = true

    logger.info("Ensuring Cubicles backend connection")
    void ensureCubiclesBackend().then((state) => {
      if (isMounted) {
        logger.info("Cubicles backend state resolved", state)
        setBackendState(state)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    logger.info("Backend state changed", backendState)
  }, [backendState])

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

  const slashCommandsQuery = useQuery({
    queryKey: ["cubicles", "slash-commands"],
    queryFn: fetchCubiclesSlashCommands,
    enabled: backendState.mode === "ready",
  })

  const remoteSessionIds = useMemo(
    () => new Set(sessionsQuery.data?.map((session) => session.id) ?? []),
    [sessionsQuery.data]
  )

  const visibleSessions = useMemo(() => {
    if (backendState.mode !== "ready") {
      return localSessions
    }

    return (sessionsQuery.data ?? []).map<SessionSummary>((session) => ({
      id: session.id,
      title: session.name,
      workspace: session.workspace_name,
      preview: session.is_active
        ? "Active Cubicles session"
        : "Synced from the local Cubicles server.",
      updatedAtLabel: new Date(session.updated_at).toLocaleString(),
      status: session.is_active ? "live" : "ready",
    }))
  }, [backendState.mode, localSessions, sessionsQuery.data])

  const activeSession = useMemo(
    () =>
      visibleSessions.find((session) => session.id === selectedSessionId) ??
      visibleSessions[0],
    [selectedSessionId, visibleSessions]
  )

  const deleteCandidateSession = useMemo(
    () =>
      deleteCandidateSessionId
        ? visibleSessions.find((session) => session.id === deleteCandidateSessionId) ?? null
        : null,
    [deleteCandidateSessionId, visibleSessions]
  )

  const activeRemoteSession = useMemo(
    () =>
      sessionsQuery.data?.find((session) => session.id === activeSession?.id) ?? null,
    [activeSession?.id, sessionsQuery.data]
  )

  const activeProfileSummary = useMemo(() => {
    if (!profilesQuery.data?.length) {
      return null
    }

    return (
      profilesQuery.data.find((profile) => profile.name === settingsQuery.data?.default_profile) ??
      profilesQuery.data[0] ??
      null
    )
  }, [profilesQuery.data, settingsQuery.data?.default_profile])

  const sessionHistoryQuery = useQuery({
    queryKey: ["cubicles", "session-history", activeSession?.id],
    queryFn: () => fetchCubiclesSessionHistory(activeSession!.id),
    enabled:
      backendState.mode === "ready" &&
      Boolean(activeSession?.id) &&
      remoteSessionIds.has(activeSession.id),
  })

  const pendingApprovalQuery = useQuery({
    queryKey: ["cubicles", "pending-approval", activeSession?.id],
    queryFn: () => fetchCubiclesPendingApproval(activeSession!.id),
    enabled:
      backendState.mode === "ready" &&
      Boolean(activeSession?.id) &&
      remoteSessionIds.has(activeSession.id) &&
      activeView === "chat",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10_000,
  })

  const fallbackHistoryEntries = useMemo(
    () => mapHistoryToTranscript(sessionHistoryQuery.data),
    [sessionHistoryQuery.data]
  )

  const activeEntries = useMemo(
    () =>
      activeSession
        ? transcripts[activeSession.id] ??
          fallbackHistoryEntries ??
          buildLiveSessionPlaceholder(activeSession)
        : [],
    [activeSession, fallbackHistoryEntries, transcripts]
  )

  useEffect(() => {
    setShouldAutoScroll(true)
  }, [activeSession?.id])

  useEffect(() => {
    if (activeView !== "chat" || !shouldAutoScroll) {
      return
    }

    const container = transcriptScrollRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [activeEntries, activeView, shouldAutoScroll, showWorkingIndicator])

  function handleTranscriptScroll() {
    const container = transcriptScrollRef.current
    if (!container) {
      return
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 48
    setShouldAutoScroll(isNearBottom)
  }

  useEffect(() => {
    if (backendState.mode !== "ready") {
      return
    }

    const remoteSessions = sessionsQuery.data ?? []
    if (!remoteSessions.length) {
      setSelectedSessionId("")
      return
    }

    if (selectedSessionId && remoteSessions.some((session) => session.id === selectedSessionId)) {
      return
    }

    const preferredSessionId =
      settingsQuery.data?.active_session_id ??
      remoteSessions.find((session) => session.is_active)?.id ??
      remoteSessions[0]?.id ??
      ""

    setSelectedSessionId(preferredSessionId)
  }, [backendState.mode, selectedSessionId, sessionsQuery.data, settingsQuery.data?.active_session_id])

  useEffect(() => {
    if (
      backendState.mode !== "ready" ||
      isStreaming ||
      !activeSession?.id ||
      !remoteSessionIds.has(activeSession.id)
    ) {
      return
    }

    const mappedHistory = mapHistoryToTranscript(sessionHistoryQuery.data)
    if (!mappedHistory) {
      setTranscripts((previousTranscripts) => ({
        ...previousTranscripts,
        [activeSession.id]: [],
      }))
      return
    }

    setTranscripts((previousTranscripts) => ({
      ...previousTranscripts,
      [activeSession.id]: mappedHistory,
    }))
  }, [
    activeSession?.id,
    backendState.mode,
    isStreaming,
    remoteSessionIds,
    sessionHistoryQuery.data,
  ])

  useEffect(() => {
    if (!activeSession?.id || !pendingApprovalQuery.data) {
      return
    }

    const pending = pendingApprovalQuery.data
    const toolName = String(pending.pendingTool.name ?? "tool")
    const entryId = `tool-${activeSession.id}-pending-${toolName}`

    setTranscripts((previousTranscripts) =>
      upsertEntry(previousTranscripts, activeSession.id, entryId, () => ({
        id: entryId,
        type: "tool",
        name: toolName,
        status: "awaiting-approval",
        detail: "Waiting for user approval before execution.",
        output: JSON.stringify(pending.pendingTool, null, 2),
        timestamp: "Now",
        approvalId: pending.approvalId,
      }))
    )
  }, [activeSession?.id, pendingApprovalQuery.data])

  async function handleCreateSession() {
    setActiveView("chat")
    if (backendState.mode === "ready") {
      logger.info("Creating remote session", { currentSessionCount: visibleSessions.length })
      const createdSession = await createCubiclesSession(
        buildSessionTitle(visibleSessions.length)
      )
      setTranscripts((previousTranscripts) => ({
        ...previousTranscripts,
        [createdSession.id]: [],
      }))
      setSelectedSessionId(createdSession.id)
      logger.info("Created remote session", { sessionId: createdSession.id })
      await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })
      await queryClient.invalidateQueries({
        queryKey: ["cubicles", "session-history", createdSession.id],
      })
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
    setActiveView("chat")
    setSelectedSessionId(sessionId)
    logger.info("Selecting session", { sessionId, backendMode: backendState.mode })

    if (backendState.mode === "ready" && remoteSessionIds.has(sessionId)) {
      await activateCubiclesSession(sessionId)
      logger.info("Activated remote session", { sessionId })
      await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })
      await queryClient.invalidateQueries({
        queryKey: ["cubicles", "session-history", sessionId],
      })
    }
  }

  async function handleDeleteSession(sessionId: string) {
    const session = visibleSessions.find((entry) => entry.id === sessionId)
    if (!session || backendState.mode !== "ready") {
      return
    }

    setIsMutatingSession(true)
    try {
      const profileName =
        settingsQuery.data?.default_profile ?? profilesQuery.data?.[0]?.name ?? null
      const commandSessionId =
        settingsQuery.data?.active_session_id ??
        (selectedSessionId && remoteSessionIds.has(selectedSessionId) ? selectedSessionId : null) ??
        sessionId

      logger.info("Deleting session", { sessionId, title: session.title })
      const result = await deleteCubiclesSession(sessionId, {
        active_session_id: commandSessionId,
        profile_name: profileName,
      })

      setTranscripts((previousTranscripts) => {
        const nextTranscripts = { ...previousTranscripts }
        delete nextTranscripts[sessionId]
        return nextTranscripts
      })

      const nextSessionId = result.session_id && result.session_id !== sessionId ? result.session_id : ""
      setSelectedSessionId(nextSessionId)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["cubicles", "settings"] }),
        nextSessionId
          ? queryClient.invalidateQueries({
              queryKey: ["cubicles", "session-history", nextSessionId],
            })
          : Promise.resolve(),
      ])

      logger.info("Deleted session", {
        sessionId,
        nextSessionId: nextSessionId || null,
        commandSessionId,
      })
      setDeleteCandidateSessionId(null)
    } catch (error) {
      logger.error("Deleting session failed", { sessionId, error })
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to delete session "${session.title}".`
      )
    } finally {
      setIsMutatingSession(false)
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

  async function invalidateSessionData(sessionId: string) {
    logger.debug("Invalidating session queries", { sessionId })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] }),
      queryClient.invalidateQueries({
        queryKey: ["cubicles", "session-history", sessionId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["cubicles", "pending-approval", sessionId],
      }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "settings"] }),
    ])
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
        logger.info("Received session context", { sessionId: event.sessionId, streamId })
        setSelectedSessionId(event.sessionId)
        return
      }
      case "assistant_delta": {
        setShowWorkingIndicator(false)
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
        const entryId = buildToolPreviewEntryId(sessionId, streamId)
        setShowWorkingIndicator(false)
        setTranscripts((previousTranscripts) =>
          upsertEntry(previousTranscripts, sessionId, entryId, () => ({
            id: entryId,
            type: "tool-preview",
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
        logger.info("Received tool event", {
          sessionId,
          streamId,
          eventType: event.type,
          toolName,
        })
        setShowWorkingIndicator(false)
        setTranscripts((previousTranscripts) =>
          upsertEntry(
            removeEntry(previousTranscripts, sessionId, buildToolPreviewEntryId(sessionId, streamId)),
            sessionId,
            entryId,
            () => ({
              id: entryId,
              type: "tool",
              name: toolName,
              status:
                event.type === "tool_result" || event.type === "tool_skipped"
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
              approvalId: event.type === "awaiting_approval" ? event.approvalId : undefined,
              step: event.type === "tool_call" ? event.step : undefined,
              maxSteps: event.type === "tool_call" ? event.maxSteps : undefined,
            })
          )
        )
        return
      }
      case "approval_applied": {
        logger.info("Approval applied", {
          sessionId,
          approvalId: event.approvalId,
          approved: event.approved,
        })
        setTranscripts((previousTranscripts) =>
          setToolEntryByApprovalId(previousTranscripts, sessionId, event.approvalId, (entry) => ({
            ...entry,
            status: event.approved ? "running" : "completed",
            detail: event.approved
              ? "Approval granted. Resuming tool execution."
              : "Approval rejected. Tool execution was skipped.",
          }))
        )
        return
      }
      case "usage": {
        return
      }
      case "compressing": {
        const entryId = `compressing-${sessionId}-${streamId}`
        setTranscripts((prev) =>
          upsertEntry(prev, sessionId, entryId, () => ({
            id: entryId,
            type: "system",
            label: "Context",
            timestamp: "Now",
            content: "Compressing context to stay within token budget…",
          }))
        )
        return
      }
      case "turn_summary": {
        // Only surface if non-trivial
        if (event.toolsCalled === 0 && event.errorCount === 0) return
        const parts: string[] = []
        if (event.steps > 0) parts.push(`${event.steps} step${event.steps !== 1 ? "s" : ""}`)
        if (event.toolsCalled > 0) parts.push(`${event.toolsCalled} tool${event.toolsCalled !== 1 ? "s" : ""}`)
        if (event.tokensUsed > 0) parts.push(`${event.tokensUsed.toLocaleString()} tokens`)
        if (event.errorCount > 0) parts.push(`${event.errorCount} error${event.errorCount !== 1 ? "s" : ""}`)
        const entryId = `turn-summary-${sessionId}-${streamId}`
        setTranscripts((prev) =>
          upsertEntry(prev, sessionId, entryId, () => ({
            id: entryId,
            type: "system",
            label: "Turn",
            timestamp: "Now",
            content: parts.join(" · "),
          }))
        )
        return
      }
      case "error": {
        logger.error("Chat stream emitted error", {
          sessionId,
          streamId,
          message: event.message,
        })
        setShowWorkingIndicator(false)
        setTranscripts((previousTranscripts) =>
          removeEntry(
            closeThinkingBlock(previousTranscripts, sessionId, streamId),
            sessionId,
            buildToolPreviewEntryId(sessionId, streamId)
          )
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
        logger.info("Chat stream completed", { sessionId, streamId })
        setShowWorkingIndicator(false)
        setTranscripts((previousTranscripts) =>
          removeEntry(
            closeThinkingBlock(previousTranscripts, sessionId, streamId),
            sessionId,
            buildToolPreviewEntryId(sessionId, streamId)
          )
        )
        delete liveStreamStateRef.current[streamId]
        return
      }
    }
  }

  async function streamChatRequest(
    sessionId: string,
    body: CubiclesChatStreamRequest
  ) {
    const streamId = crypto.randomUUID()
    const abortController = new AbortController()
    liveStreamStateRef.current[streamId] = { thinkingOpen: false }
    activeStreamAbortRef.current = abortController
    activeStreamSessionIdRef.current = sessionId
    setShowWorkingIndicator(true)
    logger.info("Opening chat stream", {
      sessionId,
      streamId,
      mode: body.approval_id ? "approval" : "message",
    })

    try {
      for await (const event of streamCubiclesChat(body, abortController.signal)) {
        applyChatEvent(sessionId, streamId, event)
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        logger.info("Chat stream aborted locally", { sessionId, streamId })
        return
      }

      logger.error("Chat stream request failed", { sessionId, streamId, error })
      setShowWorkingIndicator(false)
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
      if (activeStreamAbortRef.current === abortController) {
        activeStreamAbortRef.current = null
      }
      if (activeStreamSessionIdRef.current === sessionId) {
        activeStreamSessionIdRef.current = null
      }
    }
  }

  async function handleStopStreaming() {
    const sessionId = activeStreamSessionIdRef.current ?? activeSession?.id
    if (!sessionId || !isStreaming) {
      return
    }

    logger.info("Interrupting active session", { sessionId })
    setShowWorkingIndicator(false)

    if (backendState.mode === "ready") {
      try {
        await stopCubiclesChat(sessionId)
      } catch (error) {
        logger.error("Failed to interrupt session cleanly", { sessionId, error })
      }
    }

    activeStreamAbortRef.current?.abort()
    setTranscripts((previousTranscripts) =>
      appendEntry(previousTranscripts, sessionId, {
        id: `stop-${crypto.randomUUID()}`,
        type: "system",
        label: "Stopped",
        timestamp: "Now",
        content: "Generation interrupted.",
      })
    )
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

    const sessionId = await resolveRemoteSessionId(activeSession)
    const profileName =
      settingsQuery.data?.default_profile ?? profilesQuery.data?.[0]?.name ?? null

    if (!profileName) {
      const entryId = `error-${crypto.randomUUID()}`
      setTranscripts((previousTranscripts) =>
        appendEntry(previousTranscripts, sessionId, {
          id: entryId,
          type: "system",
          label: "Error",
          timestamp: "Now",
          content: "No usable Cubicles profile is available yet. Configure one in profiles/settings first.",
        })
      )
      return
    }

    setIsStreaming(true)
    logger.info("Submitting chat message", {
      sessionId,
      profileName,
      length: value.length,
    })

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
      await streamChatRequest(sessionId, {
        message: value,
        session_id: sessionId,
        profile_name: profileName,
      })
    } finally {
      setIsStreaming(false)
      setShowWorkingIndicator(false)
      await invalidateSessionData(sessionId)
      logger.info("Chat message lifecycle finished", { sessionId })
    }
  }

  async function handleRunSlashCommand(command: string) {
    if (!activeSession || isStreaming) {
      return
    }

    if (backendState.mode !== "ready") {
      const entryId = `error-${crypto.randomUUID()}`
      setTranscripts((previousTranscripts) =>
        appendEntry(previousTranscripts, activeSession.id, {
          id: entryId,
          type: "system",
          label: "Error",
          timestamp: "Now",
          content: "Slash commands require a ready Cubicles backend connection.",
        })
      )
      return
    }

    const sessionId = await resolveRemoteSessionId(activeSession)
    const profileName =
      settingsQuery.data?.default_profile ?? profilesQuery.data?.[0]?.name ?? null

    if (!profileName) {
      const entryId = `error-${crypto.randomUUID()}`
      setTranscripts((previousTranscripts) =>
        appendEntry(previousTranscripts, sessionId, {
          id: entryId,
          type: "system",
          label: "Error",
          timestamp: "Now",
          content: "No usable Cubicles profile is available yet. Configure one in profiles/settings first.",
        })
      )
      return
    }

    setIsStreaming(true)

    let targetSessionId = sessionId
    logger.info("Executing slash command", { sessionId, command, profileName })

    try {
      const result = await executeCubiclesSlashCommand({
        command,
        session_id: sessionId,
        profile_name: profileName,
      })
      targetSessionId = result.session_id || sessionId
      const slashOutput =
        result.output.length > 0
          ? result.output.join("\n\n")
          : "_Command completed without output._"

      setTranscripts((previousTranscripts) => {
        const withCommand = appendEntry(previousTranscripts, targetSessionId, {
          id: `slash-command-${crypto.randomUUID()}`,
          type: "slash",
          variant: "command",
          content: command,
          timestamp: "Now",
        })

        return appendEntry(withCommand, targetSessionId, {
          id: `slash-result-${crypto.randomUUID()}`,
          type: "slash",
          variant: "result",
          content: slashOutput,
          timestamp: "Now",
        })
      })

      if (targetSessionId !== selectedSessionId) {
        setSelectedSessionId(targetSessionId)
      }
    } catch (error) {
      logger.error("Slash command failed", { sessionId, command, error })
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
      setShowWorkingIndicator(false)
      await invalidateSessionData(targetSessionId)
      if (targetSessionId !== sessionId) {
        await invalidateSessionData(sessionId)
      }
      logger.info("Slash command lifecycle finished", {
        sessionId,
        targetSessionId,
        command,
      })
    }
  }

  async function handleApprovalAction(
    approvalId: string,
    decision: { approved?: boolean; redirectMessage?: string }
  ) {
    if (!activeSession || isStreaming || backendState.mode !== "ready") {
      return
    }

    const sessionId = await resolveRemoteSessionId(activeSession)
    const profileName =
      settingsQuery.data?.default_profile ?? profilesQuery.data?.[0]?.name ?? null

    if (!profileName) {
      return
    }

    if (decision.redirectMessage) {
      const redirectMessage = decision.redirectMessage
      setTranscripts((previousTranscripts) =>
        appendEntry(previousTranscripts, sessionId, {
          id: `approval-redirect-${crypto.randomUUID()}`,
          type: "system",
          label: "Approval redirect",
          timestamp: "Now",
          content: redirectMessage,
        })
      )
      setTranscripts((previousTranscripts) =>
        setToolEntryByApprovalId(previousTranscripts, sessionId, approvalId, (entry) => ({
          ...entry,
          status: "completed",
          detail: "Redirected with user guidance instead of running the tool.",
        }))
      )
    }

    setIsStreaming(true)
    logger.info("Applying approval decision", {
      sessionId,
      approvalId,
      approved: decision.approved ?? null,
      redirected: Boolean(decision.redirectMessage),
    })

    try {
      await streamChatRequest(sessionId, {
        session_id: sessionId,
        profile_name: profileName,
        approval_id: approvalId,
        approved: decision.approved ?? null,
        redirect_message: decision.redirectMessage ?? null,
      })
    } finally {
      setIsStreaming(false)
      setShowWorkingIndicator(false)
      await invalidateSessionData(sessionId)
      logger.info("Approval lifecycle finished", { sessionId, approvalId })
    }
  }

  async function handleComposerSubmit(value: string) {
    if (value.startsWith("/")) {
      await handleRunSlashCommand(value)
      return
    }

    await handleSendMessage(value)
  }

  const contentWidthClass = activeView === "settings" ? "max-w-6xl" : "max-w-none"
  const showEmptyChatState = !activeSession && activeView === "chat"

  const paletteActions = useMemo<CommandPaletteAction[]>(() => {
    const actions: CommandPaletteAction[] = [
      {
        id: "new-session",
        label: "New Session",
        icon: <MessageSquarePlus className="size-4" />,
        onSelect: () => void handleCreateSession(),
      },
      {
        id: "settings",
        label: "Open Settings",
        icon: <Settings2 className="size-4" />,
        onSelect: () => setActiveView("settings"),
      },
    ]
    if (activeSession && activeEntries.length > 0) {
      actions.push({
        id: "export",
        label: "Export Transcript",
        icon: <Download className="size-4" />,
        onSelect: () => {
          const md = transcriptToMarkdown(activeEntries, activeSession.title)
          saveToDownloads(md, activeSession.title)
            .then((path) => {
              toast.success("Transcript saved", { description: path })
            })
            .catch(() => {
              toast.error("Export failed", { description: "Could not write to Downloads folder." })
            })
        },
      })
      actions.push({
        id: "delete-session",
        label: "Delete Current Session",
        icon: <Trash2 className="size-4" />,
        onSelect: () => setDeleteCandidateSessionId(activeSession.id),
      })
    }
    return actions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession, activeEntries])

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <CommandPalette actions={paletteActions} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.64_0.19_42_/_0.12),transparent_32%),radial-gradient(circle_at_bottom_right,oklch(0.72_0.16_55_/_0.08),transparent_26%)]" />

      {deleteCandidateSession ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background/95 p-5 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight">Delete session?</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Remove{" "}
                <span className="font-medium text-foreground">{deleteCandidateSession.title}</span>{" "}
                from Cubicles. Juice will follow whichever session the backend activates next.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteCandidateSessionId(null)}
                disabled={isMutatingSession}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void handleDeleteSession(deleteCandidateSession.id)
                }}
                disabled={isMutatingSession}
              >
                {isMutatingSession ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen} className="h-full overflow-hidden">
          <SessionSidebar
            sessions={visibleSessions}
            selectedSessionId={activeSession?.id ?? ""}
            currentView={activeView}
            isMutatingSession={isMutatingSession}
            onSelectSession={(sessionId) => {
              void handleSelectSession(sessionId)
            }}
            onCreateSession={() => {
              void handleCreateSession()
            }}
            onDeleteSession={(sessionId) => {
              setDeleteCandidateSessionId(sessionId)
            }}
            onOpenSettings={() => setActiveView("settings")}
            onOpenAdvancedTab={(tab) => {
              setActiveView("settings")
              setActiveSettingsTab(tab)
            }}
          />

          <SidebarInset className="flex min-w-0 flex-col overflow-hidden">
          <header className="border-b border-border/70 bg-background/70 px-4 py-2 backdrop-blur-xl md:px-6">
            <div className={cn("mx-auto flex w-full items-center justify-between gap-4", contentWidthClass)}>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="rounded-full">
                    <PanelLeft className="size-4" />
                    <span className="sr-only">
                      {isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    </span>
                  </SidebarTrigger>
                  <h2 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                    {activeView === "settings" ? "Settings" : activeSession?.title ?? "Juice"}
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
                {activeView === "settings" ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Profiles, durable memory, and runtime metadata
                  </p>
                ) : (
                  <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                    <HeaderMetaChip
                      label="Model"
                      value={activeProfileSummary?.model ?? "Not configured"}
                    />
                    <HeaderMetaChip
                      label="Session"
                      value={activeRemoteSession?.id ?? activeSession?.id ?? "Not selected"}
                    />
                    <HeaderMetaChip
                      label="Workspace"
                      value={
                        activeRemoteSession?.workspace_path ??
                        activeSession?.workspace ??
                        "Not selected"
                      }
                    />
                  </div>
                )}
              </div>

              {activeView === "chat" && activeSession && activeEntries.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full"
                  onClick={() => {
                    const md = transcriptToMarkdown(activeEntries, activeSession.title)
                    saveToDownloads(md, activeSession.title)
                      .then((path) => {
                        toast.success("Transcript saved", { description: path })
                      })
                      .catch(() => {
                        toast.error("Export failed", { description: "Could not write to Downloads folder." })
                      })
                  }}
                  aria-label="Export transcript"
                >
                  <Download className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-full"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </header>

          {activeView === "settings" ? (
            <SettingsScreen
              backendState={backendState}
              activeTab={activeSettingsTab}
              onActiveTabChange={setActiveSettingsTab}
            />
          ) : showEmptyChatState ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
              {backendState.mode === "starting" ? (
                <>
                  <div className="size-10 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground/80">Starting backend…</p>
                    <p className="text-xs text-muted-foreground">Cubicles is warming up. This may take a moment.</p>
                  </div>
                </>
              ) : backendState.mode === "error" ? (
                <>
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                    <XCircle className="size-6 text-red-400" />
                  </div>
                  <div className="max-w-sm space-y-1.5">
                    <p className="text-sm font-medium text-foreground">Backend connection failed</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{backendState.detail}</p>
                    <p className="text-xs text-muted-foreground/70">
                      Check Settings → Overview for diagnostics.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <MessageSquarePlus className="size-6 text-primary/70" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground/80">Welcome to Juice</p>
                    <p className="text-xs text-muted-foreground">
                      Create a session to start chatting with your AI workspace.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => void handleCreateSession()}
                    >
                      <MessageSquarePlus className="mr-1.5 size-3.5" />
                      New Session
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      or press{" "}
                      <kbd className="rounded border border-border/70 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
                        ⌘K
                      </kbd>
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div
                ref={transcriptScrollRef}
                onScroll={handleTranscriptScroll}
                className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4"
              >
                  <div className={cn("mx-auto w-full", contentWidthClass)}>
                    <ChatTranscript
                      entries={activeEntries}
                      showWorkingIndicator={showWorkingIndicator}
                      approvalBusy={isStreaming}
                      onApproveApproval={(approvalId) => {
                        void handleApprovalAction(approvalId, { approved: true })
                      }}
                      onRejectApproval={(approvalId) => {
                        void handleApprovalAction(approvalId, { approved: false })
                      }}
                      onRedirectApproval={(approvalId, message) => {
                        void handleApprovalAction(approvalId, { redirectMessage: message })
                      }}
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/70 bg-background/88 px-3 py-3 backdrop-blur md:px-4">
                  <div className={cn("mx-auto w-full", contentWidthClass)}>
                    <ChatComposer
                      onSubmit={(value) => {
                        void handleComposerSubmit(value)
                      }}
                      onStop={() => {
                        void handleStopStreaming()
                      }}
                      disabled={backendState.mode === "error"}
                      isStreaming={isStreaming}
                      slashCommands={slashCommandsQuery.data?.commands ?? []}
                      profileNames={profilesQuery.data?.map((profile) => profile.name) ?? []}
                      sessions={visibleSessions.map((session) => ({
                        id: session.id,
                        title: session.title,
                      }))}
                    />
                  </div>
                </div>
            </>
          )}
          </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BarChart2, Clipboard, MessageSquarePlus, Moon, PanelLeft, Settings2, Sun, Trash2, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "@/hooks/use-theme"
import { toast } from "sonner"

import {
  activateCubiclesSession,
  createCubiclesSession,
  deleteCubiclesSession,
  fetchCubiclesPendingApproval,
  fetchCubiclesSessionHistory,
  fetchCubiclesProfiles,
  fetchCubiclesSessions,
  fetchCubiclesSettings,
  fetchCubiclesSlashCommands,
  fetchCubiclesToolReferences,
  stopCubiclesChat,
  streamCubiclesChat,
  streamCubiclesSlashCommand,
  updateCubiclesSession,
} from "@/lib/cubicles-api/client"
import type {
  CubiclesChatEvent,
  CubiclesChatStreamRequest,
} from "@/lib/cubicles-api/types"
import { type CubiclesBackendState, ensureCubiclesBackend, getCubiclesApiBase } from "@/lib/tauri/cubicles-backend"
import { CommandPalette, type CommandPaletteAction } from "@/components/command-palette"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ChatTranscript } from "@/components/chat/chat-transcript"
import { SessionSidebar } from "@/components/session-sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SettingsScreen, type SettingsTab } from "@/features/settings/settings-screen"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { type SessionSummary, type TranscriptEntry } from "@/lib/types"
import { persistWorkingDirectory, readWorkingDirectory } from "@/lib/working-directory"
import { createLogger } from "@/lib/logger"
import { transcriptToMarkdown } from "@/lib/transcript-export"
import { cn } from "@/lib/utils"
import {
  appendEntry,
  buildAssistantFallbackResponse,
  buildBackendInfo,
  buildLiveSessionPlaceholder,
  buildSessionTitle,
  buildSystemEntry,
  buildVisibleSessions,
  mapHistoryToTranscript,
  replaceTranscriptFromHistory,
  reduceStreamEvent,
  resolvePreferredSessionId,
  setToolEntryByApprovalId,
  syncPendingApprovalEntry,
  upsertEntry,
} from "./transcript-helpers"

function HeaderMetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background/55 px-2 py-1 text-[11px] leading-none text-muted-foreground">
      <span className="shrink-0 font-medium text-foreground/75">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  )
}

const logger = createLogger("chat-panel")
const NO_PROFILE_ERROR = "No usable Cubicles profile is available yet. Configure one in Settings → Profiles first."

function inferSlashWorkingLabel(command: string, latestLine?: string) {
  const trimmed = command.trim()
  const [head = "", sub = ""] = trimmed.split(/\s+/)
  const lowerHead = head.toLowerCase()
  const lowerSub = sub.toLowerCase()
  let activity = "Processing"

  if (lowerHead === "/compact") activity = "Compacting"
  else if (lowerHead === "/extensions" && lowerSub === "generate") activity = "Generating"
  else if (lowerHead === "/extensions" && (lowerSub === "delete" || lowerSub === "remove")) activity = "Deleting"
  else if (lowerHead === "/extensions" && lowerSub === "add") activity = "Adding"
  else if (lowerHead === "/memory" || lowerHead === "/skills" || lowerHead === "/api" || lowerHead === "/profile") activity = "Updating"
  else if (lowerHead === "/new" || lowerHead === "/session" || lowerHead === "/sessions") activity = "Switching"

  const tokenMatch = latestLine?.match(/\[(?:~)?([\d,]+)\s+tokens\]/i)
  const tokenSuffix = tokenMatch?.[1] ? ` [${tokenMatch[1]} tokens]` : ""
  return `${activity} ${head || "command"}…${tokenSuffix}`
}

export function ChatPanel() {
  const queryClient = useQueryClient()
  const [localSessions, setLocalSessions] = useState<SessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptEntry[]>>({})
  const [backendState, setBackendState] = useState<CubiclesBackendState>({
    mode: "starting",
    apiBase: getCubiclesApiBase(),
    detail: "Starting Cubicles desktop integration...",
    pid: null,
  })
  const { theme, toggleTheme } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState<"chat" | "settings">("chat")
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("overview")
  const [workingDirectory, setWorkingDirectory] = useState(() => readWorkingDirectory())
  const workspaceReady = workingDirectory.trim().length > 0
  const [isStreaming, setIsStreaming] = useState(false)
  const [isMutatingSession, setIsMutatingSession] = useState(false)
  const [deleteCandidateSessionId, setDeleteCandidateSessionId] = useState<string | null>(null)
  const [workingLabel, setWorkingLabel] = useState<string | null>(null)
  const showWorkingIndicator = workingLabel !== null
  function setShowWorkingIndicator(value: boolean | string) {
    setWorkingLabel(value === false || value === null ? null : value === true ? "Working…" : value)
  }
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [advancedMode, setAdvancedMode] = useState<boolean>(() => {
    try { return localStorage.getItem("juice:advanced-mode") === "true" } catch { return false }
  })
  const [liveUsage, setLiveUsage] = useState<{ total?: number; contextUsedTokens?: number; promptBudget?: number } | null>(null)
  const liveStreamStateRef = useRef<Record<string, { thinkingOpen: boolean }>>({})
  const activeStreamAbortRef = useRef<AbortController | null>(null)
  const activeStreamSessionIdRef = useRef<string | null>(null)
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null)
  /** Sessions that just finished streaming — skip history hydration to prevent flash. */
  const freshlyStreamedRef = useRef<Set<string>>(new Set())

  function toggleAdvancedMode() {
    setAdvancedMode((prev) => {
      const next = !prev
      try { localStorage.setItem("juice:advanced-mode", String(next)) } catch { /* ignore */ }
      return next
    })
  }

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

  useEffect(() => {
    persistWorkingDirectory(workingDirectory)
  }, [workingDirectory])

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

  const toolReferencesQuery = useQuery({
    queryKey: ["cubicles", "tool-references"],
    queryFn: fetchCubiclesToolReferences,
    enabled: backendState.mode === "ready",
    staleTime: 5 * 60 * 1000,
  })

  const remoteSessionIds = useMemo(
    () => new Set(sessionsQuery.data?.map((session) => session.id) ?? []),
    [sessionsQuery.data]
  )

  const visibleSessions = useMemo<SessionSummary[]>(
    () => buildVisibleSessions(backendState, localSessions, sessionsQuery.data, undefined),
    [backendState, localSessions, sessionsQuery.data]
  )

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

  const commitWorkingDirectory = useCallback(
    async (path: string) => {
      const normalized = path.trim()
      setWorkingDirectory(normalized)
      persistWorkingDirectory(normalized)
      if (backendState.mode !== "ready" || !normalized) {
        return
      }
      const sid =
        selectedSessionId && remoteSessionIds.has(selectedSessionId)
          ? selectedSessionId
          : activeSession?.id
      if (sid && remoteSessionIds.has(sid)) {
        try {
          await updateCubiclesSession(sid, { workspace_path: normalized })
          await queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] })
        } catch (error) {
          logger.error("Failed to sync working folder to session", { sid, error })
          toast.error(
            error instanceof Error ? error.message : "Could not update session working folder."
          )
        }
      }
    },
    [
      activeSession?.id,
      backendState.mode,
      queryClient,
      remoteSessionIds,
      selectedSessionId,
    ]
  )

  const contextUsagePercent = useMemo(() => {
    if (liveUsage?.contextUsedTokens != null && liveUsage?.promptBudget) {
      return Math.round((liveUsage.contextUsedTokens / liveUsage.promptBudget) * 100)
    }
    return activeRemoteSession?.context_usage_percent ?? 0
  }, [liveUsage, activeRemoteSession])

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

  const sidebarSessions = useMemo<SessionSummary[]>(
    () =>
      visibleSessions.map((session) => ({
        ...session,
        hasPendingApproval:
          !pendingApprovalQuery.isFetching &&
          pendingApprovalQuery.data?.approvalId != null &&
          pendingApprovalQuery.data.sessionId === session.id,
      })),
    [pendingApprovalQuery.data, pendingApprovalQuery.isFetching, visibleSessions]
  )

  const fallbackHistoryEntries = useMemo(
    () => mapHistoryToTranscript(sessionHistoryQuery.data),
    [sessionHistoryQuery.data]
  )

  const activeEntries = useMemo(
    () =>
      activeSession
        ? transcripts[activeSession.id] ??
          fallbackHistoryEntries ??
          buildLiveSessionPlaceholder()
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

    if (selectedSessionId && visibleSessions.some((session) => session.id === selectedSessionId)) {
      return
    }

    const remoteSessions = sessionsQuery.data ?? []
    if (!visibleSessions.length) {
      setSelectedSessionId("")
      return
    }

    const preferredSessionId = resolvePreferredSessionId(
      selectedSessionId,
      visibleSessions,
      remoteSessions,
      settingsQuery.data?.active_session_id
    )

    if (preferredSessionId !== selectedSessionId) {
      setSelectedSessionId(preferredSessionId)
    }
  }, [backendState.mode, selectedSessionId, sessionsQuery.data, settingsQuery.data?.active_session_id, visibleSessions])

  useEffect(() => {
    if (
      backendState.mode !== "ready" ||
      isStreaming ||
      !activeSession?.id ||
      !remoteSessionIds.has(activeSession.id)
    ) {
      return
    }

    const sid = activeSession.id
    const skipIfFresh = freshlyStreamedRef.current.has(sid)
    const mappedHistory = mapHistoryToTranscript(sessionHistoryQuery.data)
    setTranscripts((previousTranscripts) =>
      replaceTranscriptFromHistory(previousTranscripts, sid, mappedHistory, skipIfFresh)
    )
    // After one hydration cycle with the guard, clear the flag so future
    // hydrations (e.g. after user switches away and back) work normally.
    if (skipIfFresh) {
      freshlyStreamedRef.current.delete(sid)
    }
    // NOTE: isStreaming is intentionally excluded from deps. Including it causes a flash:
    // when streaming ends, this effect would fire with stale query data before the
    // invalidation has re-fetched fresh history. The guard above is a safety net for
    // background refetches that happen to land during an active stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, backendState.mode, remoteSessionIds, sessionHistoryQuery.data])

  useEffect(() => {
    if (!activeSession?.id || isStreaming || pendingApprovalQuery.isFetching) {
      return
    }

    setTranscripts((previousTranscripts) =>
      syncPendingApprovalEntry(
        previousTranscripts,
        activeSession.id,
        pendingApprovalQuery.data ?? null
      )
    )
  }, [activeSession?.id, isStreaming, pendingApprovalQuery.data, pendingApprovalQuery.isFetching])

  async function handleCreateSession() {
    setActiveView("chat")
    const id = crypto.randomUUID()
    const title = buildSessionTitle(visibleSessions.length)
    const session: SessionSummary = {
      id,
      title,
      workspace: workspaceReady ? workingDirectory.split("/").filter(Boolean).at(-1) ?? "Draft" : "Draft",
      preview: "Draft session. A real Cubicles session will start on the first message.",
      updatedAtLabel: "Just now",
      status: "idle",
    }

    setLocalSessions((previousSessions) => [session, ...previousSessions])
    setTranscripts((prev) =>
      appendEntry(prev, id, buildSystemEntry("Draft session", "This draft stays local until you send the first message or slash command. Juice will create the real Cubicles session at that point."))
    )
    setSelectedSessionId(id)
    logger.info("Created local draft session", { sessionId: id })
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
    if (!session) {
      return
    }

    if (!remoteSessionIds.has(sessionId)) {
      setLocalSessions((previousSessions) =>
        previousSessions.filter((entry) => entry.id !== sessionId)
      )
      setTranscripts((previousTranscripts) => {
        const nextTranscripts = { ...previousTranscripts }
        delete nextTranscripts[sessionId]
        return nextTranscripts
      })
      if (selectedSessionId === sessionId) {
        setSelectedSessionId("")
      }
      setDeleteCandidateSessionId(null)
      return
    }

    if (backendState.mode !== "ready") {
      return
    }

    setIsMutatingSession(true)
    try {
      logger.info("Deleting session", { sessionId, title: session.title })
      await deleteCubiclesSession(sessionId)

      setTranscripts((previousTranscripts) => {
        const nextTranscripts = { ...previousTranscripts }
        delete nextTranscripts[sessionId]
        return nextTranscripts
      })

      if (selectedSessionId === sessionId) {
        setSelectedSessionId("")
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] }),
        queryClient.invalidateQueries({ queryKey: ["cubicles", "settings"] }),
      ])

      logger.info("Deleted session", {
        sessionId,
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

    const createdSession = await createCubiclesSession(session.title, workingDirectory)
    await activateCubiclesSession(createdSession.id)
    setLocalSessions((previousSessions) =>
      previousSessions.filter((entry) => entry.id !== session.id)
    )
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cubicles", "sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "settings"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "session-history", createdSession.id] }),
    ])

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

  function applyChatEvent(sessionId: string, streamId: string, event: CubiclesChatEvent) {
    if (event.type === "session_context") {
      logger.info("Received session context", { sessionId: event.sessionId, streamId })
    } else if (
      event.type === "tool_call" ||
      event.type === "tool_running" ||
      event.type === "awaiting_approval" ||
      event.type === "tool_result" ||
      event.type === "tool_skipped"
    ) {
      logger.info("Received tool event", {
        sessionId,
        streamId,
        eventType: event.type,
        toolName:
          "name" in event
            ? event.name
            : "tool" in event
              ? String(event.tool.name ?? "tool")
              : String(event.pendingTool.name ?? "tool"),
      })
    } else if (event.type === "approval_applied") {
      logger.info("Approval applied", {
        sessionId,
        approvalId: event.approvalId,
        approved: event.approved,
      })
    } else if (event.type === "assistant_delta") {
      logger.info("Assistant delta received", {
        sessionId,
        streamId,
        length: event.delta.length,
      })
    } else if (event.type === "turn_summary") {
      logger.info("Turn summary", {
        sessionId,
        steps: event.steps,
        toolsCalled: event.toolsCalled,
        tokensUsed: event.tokensUsed,
      })
    } else if (event.type === "error") {
      logger.error("Chat stream emitted error", {
        sessionId,
        streamId,
        message: event.message,
      })
    } else if (event.type === "done") {
      logger.info("Chat stream completed", { sessionId, streamId })
    }

    let nextSelection: string | undefined
    let nextWorkingLabel: string | null | undefined
    let nextLiveUsage:
      | { total?: number; contextUsedTokens?: number; promptBudget?: number }
      | null
      | undefined
    let shouldClearStreamState = false

    setTranscripts((previousTranscripts) => {
      const reduction = reduceStreamEvent(
        previousTranscripts,
        sessionId,
        streamId,
        event,
        liveStreamStateRef.current
      )
      nextSelection = reduction.selectedSessionId
      nextWorkingLabel = reduction.workingLabel
      nextLiveUsage = reduction.liveUsage
      shouldClearStreamState = reduction.clearStreamState === true
      return reduction.transcripts
    })

    if (nextSelection) {
      setSelectedSessionId(nextSelection)
    }
    if (nextWorkingLabel !== undefined) {
      setShowWorkingIndicator(nextWorkingLabel ?? false)
    }
    if (nextLiveUsage !== undefined) {
      setLiveUsage(nextLiveUsage)
    }
    if (shouldClearStreamState) {
      delete liveStreamStateRef.current[streamId]
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
      applyChatEvent(sessionId, streamId, {
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      })
      activeStreamAbortRef.current = null
    }
    if (activeStreamSessionIdRef.current === sessionId) {
      activeStreamSessionIdRef.current = null
    }
  }

  async function handleStopStreaming(force = false) {
    const sessionId = activeStreamSessionIdRef.current ?? activeSession?.id
    const canStopForApproval =
      force &&
      !!activeSession?.id &&
      !!awaitingApprovalEntry?.approvalId &&
      sessionId === activeSession.id

    if (!sessionId || (!isStreaming && !canStopForApproval)) {
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
    setTranscripts((prev) =>
      appendEntry(prev, sessionId, buildSystemEntry("Stopped", "Generation interrupted."))
    )
    await queryClient.invalidateQueries({
      queryKey: ["cubicles", "pending-approval", sessionId],
    })
  }

  async function handleSendMessage(value: string) {
    if (!activeSession || isStreaming) {
      return
    }

    if (backendState.mode === "ready" && !workspaceReady) {
      toast.error("Choose a working folder in Settings → Working folder.")
      setActiveSettingsTab("working-folder")
      setActiveView("settings")
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
      setTranscripts((prev) =>
        appendEntry(prev, sessionId, buildSystemEntry("Error", NO_PROFILE_ERROR))
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
        workspace_path: workingDirectory,
      })
    } finally {
      freshlyStreamedRef.current.add(sessionId)
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

    if (backendState.mode === "ready" && !workspaceReady) {
      toast.error("Choose a working folder in Settings → Working folder.")
      setActiveSettingsTab("working-folder")
      setActiveView("settings")
      return
    }

    if (backendState.mode !== "ready") {
      setTranscripts((prev) =>
        appendEntry(prev, activeSession.id, buildSystemEntry("Error", "Slash commands require a ready Cubicles backend connection."))
      )
      return
    }

    const sessionId = await resolveRemoteSessionId(activeSession)
    const profileName =
      settingsQuery.data?.default_profile ?? profilesQuery.data?.[0]?.name ?? null

    if (!profileName) {
      setTranscripts((prev) =>
        appendEntry(prev, sessionId, buildSystemEntry("Error", NO_PROFILE_ERROR))
      )
      return
    }

    setIsStreaming(true)

    let targetSessionId = sessionId
    const streamId = crypto.randomUUID()
    const commandEntryId = `slash-command-${streamId}`
    const resultEntryId = `slash-result-${streamId}`
    logger.info("Executing slash command", { sessionId, command, profileName })

    try {
      setTranscripts((previousTranscripts) => {
        const withCommand = appendEntry(previousTranscripts, sessionId, {
          id: commandEntryId,
          type: "slash",
          variant: "command",
          content: command,
          timestamp: "Now",
        })
        return withCommand
      })
      setShowWorkingIndicator(inferSlashWorkingLabel(command))

      for await (const event of streamCubiclesSlashCommand({
        command,
        session_id: sessionId,
        profile_name: profileName,
        workspace_path: workingDirectory,
      })) {
        if (event.type === "output") {
          setTranscripts((previousTranscripts) =>
            upsertEntry(previousTranscripts, sessionId, resultEntryId, (currentEntry) => ({
              id: resultEntryId,
              type: "slash",
              variant: "result",
              content:
                currentEntry?.type === "slash" && currentEntry.variant === "result" && currentEntry.content
                  ? `${currentEntry.content}\n\n${event.line}`
                  : event.line,
              timestamp: "Now",
            }))
          )
          setShowWorkingIndicator(inferSlashWorkingLabel(command, event.line))
          continue
        }

        if (event.type === "done") {
          targetSessionId = event.session_id || sessionId
          if (targetSessionId !== sessionId) {
            setTranscripts((previousTranscripts) => {
              const fromEntries = [...(previousTranscripts[sessionId] ?? [])]
              const movedEntries = fromEntries.filter(
                (entry) => entry.id === commandEntryId || entry.id === resultEntryId
              )
              const remainingEntries = fromEntries.filter(
                (entry) => entry.id !== commandEntryId && entry.id !== resultEntryId
              )
              return {
                ...previousTranscripts,
                [sessionId]: remainingEntries,
                [targetSessionId]: [...(previousTranscripts[targetSessionId] ?? []), ...movedEntries],
              }
            })
          }

          const slashOutput =
            event.output.length > 0
              ? event.output.join("\n\n")
              : "_Command completed without output._"
          setTranscripts((previousTranscripts) =>
            upsertEntry(previousTranscripts, targetSessionId, resultEntryId, () => ({
              id: resultEntryId,
              type: "slash",
              variant: "result",
              content: slashOutput,
              timestamp: "Now",
            }))
          )
          continue
        }

        throw new Error(event.message)
      }

      if (targetSessionId !== selectedSessionId) {
        setSelectedSessionId(targetSessionId)
      }
    } catch (error) {
      logger.error("Slash command failed", { sessionId, command, error })
      setTranscripts((prev) =>
        appendEntry(prev, sessionId, buildSystemEntry("Error", error instanceof Error ? error.message : String(error)))
      )
    } finally {
      freshlyStreamedRef.current.add(targetSessionId)
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

    if (!workspaceReady) {
      toast.error("Choose a working folder in Settings → Working folder.")
      setActiveSettingsTab("working-folder")
      setActiveView("settings")
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
      setTranscripts((prev) =>
        appendEntry(prev, sessionId, buildSystemEntry("Approval redirect", redirectMessage))
      )
        setTranscripts((prev) =>
          setToolEntryByApprovalId(prev, sessionId, approvalId, (entry) => ({
            ...entry,
            status: "completed",
            statusMessage: "Redirected with user guidance instead of running the tool.",
            detail: "Redirected with user guidance instead of running the tool.",
            output: decision.redirectMessage,
            returnCode: 0,
          }))
        )
      }

    setIsStreaming(true)
    queryClient.setQueryData(["cubicles", "pending-approval", sessionId], null)
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
        workspace_path: workingDirectory,
        approval_id: approvalId,
        approved: decision.approved ?? null,
        redirect_message: decision.redirectMessage ?? null,
      })
    } finally {
      freshlyStreamedRef.current.add(sessionId)
      setIsStreaming(false)
      setShowWorkingIndicator(false)
      await invalidateSessionData(sessionId)
      logger.info("Approval lifecycle finished", { sessionId, approvalId })
    }
  }

  const awaitingApprovalEntry = useMemo(
    () =>
      activeEntries.find(
        (e) => e.type === "tool" && (e as Extract<typeof e, { type: "tool" }>).status === "awaiting-approval"
      ) as Extract<(typeof activeEntries)[number], { type: "tool" }> | undefined,
    [activeEntries]
  )

  async function handleComposerSubmit(value: string) {
    // If there's a pending approval, treat the message as a redirect
    if (awaitingApprovalEntry?.approvalId) {
      await handleApprovalAction(awaitingApprovalEntry.approvalId, { redirectMessage: value })
      return
    }

    if (value.startsWith("/")) {
      await handleRunSlashCommand(value)
      return
    }

    await handleSendMessage(value)
  }

  async function handleStopAction() {
    if (awaitingApprovalEntry?.approvalId) {
      await handleStopStreaming(true)
      return
    }

    await handleStopStreaming()
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
        label: "Copy Transcript as Markdown",
        icon: <Clipboard className="size-4" />,
        onSelect: () => {
          const md = transcriptToMarkdown(activeEntries, activeSession.title)
          navigator.clipboard.writeText(md)
            .then(() => {
              toast.success("Copied to clipboard")
            })
            .catch(() => {
              toast.error("Copy failed", { description: "Could not write to clipboard." })
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
            sessions={sidebarSessions}
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
          />

          <SidebarInset className="flex min-w-0 flex-col overflow-hidden">
          <header className="relative border-b border-border/70 bg-background/70 px-4 py-2 backdrop-blur-xl md:px-6">
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
                    {(() => {
                      const { label, tooltip } = buildBackendInfo(backendState)
                      return (
                        <>
                          <button
                            type="button"
                            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                            aria-label={label}
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
                              <span className="sr-only">{label}</span>
                            </span>
                          </button>
                          <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 w-72 -translate-x-1/2 rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg backdrop-blur transition-opacity duration-150 group-hover/status:opacity-100 group-focus-within/status:opacity-100">
                            {tooltip}
                          </div>
                        </>
                      )
                    })()}
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
                        (workspaceReady ? workingDirectory : null) ??
                        activeRemoteSession?.workspace_path ??
                        activeSession?.workspace ??
                        "Not selected"
                      }
                    />
                    {advancedMode && contextUsagePercent > 0 && (
                      <HeaderMetaChip
                        label="CTX"
                        value={`${contextUsagePercent}%`}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {activeView === "chat" && activeSession && activeEntries.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-full"
                        onClick={() => {
                          const md = transcriptToMarkdown(activeEntries, activeSession.title)
                          navigator.clipboard.writeText(md)
                            .then(() => toast.success("Copied to clipboard"))
                            .catch(() => toast.error("Copy failed", { description: "Could not write to clipboard." }))
                        }}
                        aria-label="Copy transcript as markdown"
                      >
                        <Clipboard className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Copy as Markdown</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={advancedMode ? "secondary" : "ghost"}
                      size="icon-sm"
                      className="rounded-full"
                      onClick={toggleAdvancedMode}
                      aria-label={advancedMode ? "Hide backend details" : "Show advanced details"}
                    >
                      <BarChart2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {advancedMode ? "Hide details" : "Advanced mode"}
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>
            </div>
            {advancedMode && contextUsagePercent > 0 && (
              <div
                className="absolute bottom-0 left-0 h-[2px] transition-all duration-500"
                style={{
                  width: `${Math.min(contextUsagePercent, 100)}%`,
                  background:
                    contextUsagePercent >= 80
                      ? "var(--destructive)"
                      : contextUsagePercent >= 50
                        ? "oklch(0.75 0.18 80)"
                        : "var(--primary)",
                }}
              />
            )}
          </header>

          {backendState.mode === "ready" && !workspaceReady ? (
            <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs leading-relaxed text-amber-950 dark:text-amber-50/95">
              <span className="font-medium">Working folder required.</span>{" "}
              Cubicles needs an on-disk project directory before chat or tools can run.{" "}
              <button
                type="button"
                className="font-medium underline decoration-amber-700/50 underline-offset-2 hover:decoration-amber-950 dark:hover:decoration-amber-100"
                onClick={() => {
                  setActiveSettingsTab("working-folder")
                  setActiveView("settings")
                }}
              >
                Choose folder
              </button>
            </div>
          ) : null}

          {activeView === "settings" ? (
            <SettingsScreen
              backendState={backendState}
              activeTab={activeSettingsTab}
              onActiveTabChange={setActiveSettingsTab}
              workingDirectory={workingDirectory}
              onWorkingDirectoryCommit={commitWorkingDirectory}
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
                      {workspaceReady
                        ? "Create your first session to start chatting."
                        : "Pick a working folder under Settings, then create your first session."}
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
                      isStreaming={isStreaming}
                      showWorkingIndicator={showWorkingIndicator}
                      workingLabel={workingLabel ?? "Working…"}
                      advancedMode={advancedMode}
                      approvalBusy={isStreaming}
                      onApproveApproval={(approvalId) => {
                        void handleApprovalAction(approvalId, { approved: true })
                      }}
                      onRejectApproval={(approvalId) => {
                        void handleApprovalAction(approvalId, { approved: false })
                      }}
                      onStop={() => {
                        void handleStopAction()
                      }}
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-border/70 bg-background/88 px-3 py-2 backdrop-blur md:px-4">
                  <div className={cn("mx-auto w-full", contentWidthClass)}>
                    <ChatComposer
                      onSubmit={(value) => {
                        void handleComposerSubmit(value)
                      }}
                      onStop={() => {
                        void handleStopAction()
                      }}
                      disabled={backendState.mode === "error"}
                      isStreaming={isStreaming && !awaitingApprovalEntry}
                      isAwaitingApproval={Boolean(awaitingApprovalEntry?.approvalId)}
                      slashCommands={slashCommandsQuery.data?.commands ?? []}
                      profileNames={profilesQuery.data?.map((profile) => profile.name) ?? []}
                      sessions={visibleSessions.map((session) => ({
                        id: session.id,
                        title: session.title,
                      }))}
                      toolReferences={toolReferencesQuery.data ?? []}
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

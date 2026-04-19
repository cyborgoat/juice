import { AnimatePresence, motion } from "motion/react"
import { Bot, CheckCircle2, ChevronRight, LoaderCircle, ShieldCheck, Sparkles, Terminal, User, X, XCircle } from "lucide-react"
import { useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { CopyButton } from "@/components/chat/code-block"
import { cn } from "@/lib/utils"
import type { TranscriptEntry } from "@/lib/types"

type ChatTranscriptProps = {
  entries: TranscriptEntry[]
  isStreaming?: boolean
  showWorkingIndicator?: boolean
  workingLabel?: string
  advancedMode?: boolean
  onApproveApproval?: (approvalId: string) => void
  onRejectApproval?: (approvalId: string) => void
  onRedirectApproval?: (approvalId: string, message: string) => void
  approvalBusy?: boolean
}


export function ChatTranscript({
  entries,
  isStreaming = false,
  showWorkingIndicator = false,
  workingLabel = "Working…",
  advancedMode = false,
  onApproveApproval,
  onRejectApproval,
  onRedirectApproval,
  approvalBusy = false,
}: ChatTranscriptProps) {
  const [redirectDrafts, setRedirectDrafts] = useState<Record<string, string>>({})
  const [openDialogId, setOpenDialogId] = useState<string | null>(null)

  function updateRedirectDraft(entryId: string, value: string) {
    setRedirectDrafts((currentDrafts) => ({
      ...currentDrafts,
      [entryId]: value,
    }))
  }

  function submitRedirect(entry: Extract<TranscriptEntry, { type: "tool" }>) {
    if (!entry.approvalId || !onRedirectApproval) {
      return
    }

    const message = (redirectDrafts[entry.id] ?? "").trim()
    if (!message) {
      return
    }

    onRedirectApproval(entry.approvalId, message)
    setRedirectDrafts((currentDrafts) => ({
      ...currentDrafts,
      [entry.id]: "",
    }))
  }

  const dialogEntry = openDialogId
    ? entries.find((e) => e.id === openDialogId && e.type === "tool-preview")
    : null

  return (
    <div className="flex min-w-0 w-full flex-col space-y-2 px-3 py-2 md:px-4 md:py-3">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          if (entry.type === "message") {
            const isUser = entry.role === "user"

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn("flex w-full min-w-0", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "flex min-w-0 w-full flex-col",
                    isUser
                      ? "items-end"
                      : "max-w-none items-start"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex gap-3 px-1 text-[11px]",
                      isUser ? "text-primary/80" : "text-muted-foreground"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                      {isUser ? "You" : "Juice"}
                    </span>
                    <span className={cn(!isUser && "ml-auto")}>{entry.timestamp}</span>
                  </div>
                  <div
                    className={cn(
                      "max-w-full px-0 py-0",
                      isUser
                        ? "w-fit min-w-[16rem] max-w-[min(85%,44rem)] rounded-[1.35rem] border border-primary/20 bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm"
                        : "group/msg w-full text-foreground"
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">{entry.content}</p>
                    ) : (
                      <div className="text-sm">
                        <ChatMarkdown content={entry.content} />
                        <div className="mt-1 flex opacity-0 transition-opacity group-hover/msg:opacity-100">
                          <CopyButton text={entry.content} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          }

          if (entry.type === "slash") {
            const isCommand = entry.variant === "command"

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn("flex w-full min-w-0", isCommand ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "min-w-0",
                    isCommand ? "w-fit max-w-[min(88%,48rem)]" : "w-full"
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                    <Terminal className="size-3.5" />
                    <span>{isCommand ? "Slash command" : "Slash result"}</span>
                    <span>{entry.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      "rounded-[1.35rem] border shadow-sm",
                      isCommand
                        ? "border-sky-500/20 bg-sky-500/10 px-3.5 py-2.5 font-mono text-sm text-foreground"
                        : "group/slash border-border/70 bg-card/70 p-3.5"
                    )}
                  >
                    {isCommand ? (
                      <p className="whitespace-pre-wrap break-words">{entry.content}</p>
                    ) : (
                      <div className="text-sm">
                        <ChatMarkdown content={entry.content} />
                        <div className="mt-1 flex opacity-0 transition-opacity group-hover/slash:opacity-100">
                          <CopyButton text={entry.content} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          }

          if (entry.type === "tool-preview") {
            // Heuristic: if streaming and this is the last tool-preview, it's still generating
            const isLast = entries[entries.length - 1]?.id === entry.id
            const isGenerating = isStreaming && isLast

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="min-w-0 w-full overflow-hidden rounded-xl border border-dashed border-primary/25 bg-primary/5"
              >
                <div className="flex items-center gap-2 px-3 py-2 text-[11px]">
                  <Terminal className="size-3.5 shrink-0 text-primary/60" />
                  <span className="flex-1 font-medium">
                    {isGenerating
                      ? <TextShimmer className="text-primary/70">Generating tool call…</TextShimmer>
                      : <span className="text-primary/70">Tool preview</span>
                    }
                  </span>
                  <span className="text-muted-foreground">{entry.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => setOpenDialogId(entry.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    View
                  </button>
                  <CopyButton text={entry.content} />
                </div>
              </motion.div>
            )
          }

          if (entry.type === "tool") {
            const redirectValue = redirectDrafts[entry.id] ?? ""
            const isRunning = entry.status === "running"
            const isAwaiting = entry.status === "awaiting-approval"
            const isCompleted = entry.status === "completed"
            // Filter out internal placeholder strings that aren't useful to display
            const isGenericDetail =
              !entry.detail ||
              entry.detail === "Tool execution update" ||
              entry.detail === "Running..."
            const showOutput =
              isCompleted &&
              entry.output &&
              entry.output !== "Tool execution was skipped."

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="min-w-0 w-full overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-sm"
              >
                {/* Command header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  {entry.step != null && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] tabular-nums bg-muted text-muted-foreground">
                      {entry.maxSteps != null && entry.maxSteps > 1
                        ? `step ${entry.step}/${entry.maxSteps}`
                        : `step ${entry.step}`}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 truncate font-mono text-xs">
                    <span className="font-semibold text-foreground">{entry.name}</span>
                    {!isGenericDetail && (
                      <span className="text-muted-foreground"> {entry.detail}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{entry.timestamp}</span>
                  {isRunning && (
                    <LoaderCircle className="size-3.5 shrink-0 animate-spin text-amber-500" />
                  )}
                  {isAwaiting && (
                    <span className="shrink-0 animate-pulse rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                      approval needed
                    </span>
                  )}
                  {isCompleted && (
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                  )}
                </div>

                {/* Running: shimmer status line */}
                {isRunning && (
                  <p className="px-3 pb-2 text-xs">
                    <TextShimmer>{isGenericDetail ? "Running…" : entry.detail}</TextShimmer>
                  </p>
                )}

                {/* Awaiting approval: collapsed args + action buttons */}
                {isAwaiting && (
                  <div className="border-t border-border/50">
                    <details className="group/args">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground/60 transition-colors hover:text-muted-foreground">
                        <ShieldCheck className="size-3 text-amber-500" />
                        <span>Arguments</span>
                        <ChevronRight className="ml-auto size-3 transition-transform group-open/args:rotate-90" />
                      </summary>
                      <pre className="mx-3 mb-2 max-h-48 overflow-y-auto rounded-lg bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all">
                        {entry.output}
                      </pre>
                    </details>
                    {entry.approvalId &&
                      (onApproveApproval || onRejectApproval || onRedirectApproval) && (
                        <div className="mx-3 mb-3 rounded-xl border border-border/70 bg-background/70 p-2.5">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              disabled={approvalBusy}
                              onClick={() => onApproveApproval?.(entry.approvalId!)}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              disabled={approvalBusy}
                              onClick={() => onRejectApproval?.(entry.approvalId!)}
                            >
                              Reject
                            </Button>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row">
                            <Input
                              value={redirectValue}
                              onChange={(event) => updateRedirectDraft(entry.id, event.target.value)}
                              placeholder="Redirect with a note…"
                              disabled={approvalBusy}
                              className="h-9 rounded-xl"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="rounded-full md:self-center"
                              disabled={approvalBusy || !redirectValue.trim()}
                              onClick={() => submitRedirect(entry)}
                            >
                              Redirect
                            </Button>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Skipped */}
                {isCompleted && entry.output === "Tool execution was skipped." && (
                  <p className="border-t border-border/50 px-3 py-1.5 text-xs text-muted-foreground/60">
                    Skipped.
                  </p>
                )}

                {/* Completed: collapsible output */}
                {showOutput && (
                  <details className="group/out border-t border-border/50">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground/60 transition-colors hover:text-muted-foreground">
                      <span>Output</span>
                      <CopyButton text={entry.output} />
                      <ChevronRight className="ml-auto size-3 transition-transform group-open/out:rotate-90" />
                    </summary>
                    <pre className="mx-3 mb-2 max-h-64 resize-y overflow-y-auto rounded-lg bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {entry.output}
                    </pre>
                  </details>
                )}
              </motion.div>
            )
          }

          if (entry.type === "turn-summary") {
            if (!advancedMode) return null
            const hasMeta = entry.steps > 0 || entry.toolsCalled > 0 || entry.tokensUsed > 0 || entry.errorCount > 0
            if (!hasMeta) return null

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex w-full items-center justify-center py-1"
              >
                <div className="flex items-center gap-2 rounded-full border border-dashed border-primary/25 bg-primary/5 px-3 py-1 text-[11px] text-muted-foreground">
                  {entry.steps > 0 && (
                    <span><span className="font-semibold text-foreground/70">{entry.steps}</span> {entry.steps === 1 ? "step" : "steps"}</span>
                  )}
                  {entry.toolsCalled > 0 && (
                    <><span className="opacity-40">·</span><span><span className="font-semibold text-foreground/70">{entry.toolsCalled}</span> {entry.toolsCalled === 1 ? "tool" : "tools"}</span></>
                  )}
                  {entry.tokensUsed > 0 && (
                    <><span className="opacity-40">·</span><span><span className="font-semibold text-foreground/70">{entry.tokensUsed.toLocaleString()}</span> tokens</span></>
                  )}
                  {entry.errorCount > 0 && (
                    <><span className="opacity-40">·</span><span className="text-destructive/80"><span className="font-semibold">{entry.errorCount}</span> {entry.errorCount === 1 ? "error" : "errors"}</span></>
                  )}
                  <span className="opacity-40">·</span>
                  <span className="opacity-50">{entry.timestamp}</span>
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={cn(
                "min-w-0 w-full rounded-xl border px-3 py-2",
                entry.label === "Error"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-dashed border-primary/30 bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 text-[11px]",
                  entry.label === "Error" ? "text-destructive" : "text-primary"
                )}
              >
                {entry.label === "Error" ? <XCircle className="size-3.5" /> : <Sparkles className="size-3.5" />}
                <span>{entry.label}</span>
                <span className="text-muted-foreground">{entry.timestamp}</span>
              </div>
              <div className="mt-1.5 text-sm leading-5 text-muted-foreground">
                <ChatMarkdown content={entry.content} />
              </div>
            </motion.div>
          )
        })}
        {showWorkingIndicator ? (
          <motion.div
            key="assistant-working-indicator"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex w-full min-w-0 justify-start"
          >
            <div className="flex min-w-0 w-full max-w-none flex-col items-start">
              <div className="mb-1.5 flex gap-3 px-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Bot className="size-3.5" />
                  Juice
                </span>
                <span className="ml-auto">Now</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-[1.35rem] border border-border/70 bg-card/70 px-3.5 py-2.5 shadow-sm">
                <span className="size-2 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:-0.3s]" />
                <span className="size-2 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:-0.15s]" />
                <span className="size-2 rounded-full bg-muted-foreground/70 animate-pulse" />
                <TextShimmer className="text-xs">{workingLabel}</TextShimmer>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Tool preview detail dialog */}
      {dialogEntry?.type === "tool-preview" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm sm:items-center"
          style={{ background: "oklch(0 0 0 / 0.45)" }}
          onClick={() => setOpenDialogId(null)}
        >
          <div
            className="my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
            style={{ maxHeight: "calc(100vh - 2rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Terminal className="size-4 text-primary/70" />
                <span>Tool preview</span>
                <span className="text-muted-foreground">{dialogEntry.timestamp}</span>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton text={dialogEntry.content} />
                <button
                  type="button"
                  onClick={() => setOpenDialogId(null)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <pre className="overflow-x-auto rounded-xl bg-background/80 px-4 py-3 font-mono text-xs text-foreground/80 whitespace-pre-wrap break-all">
                {dialogEntry.content}
              </pre>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}


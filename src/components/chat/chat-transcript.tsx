import { AnimatePresence, motion } from "motion/react"
import { Bot, LoaderCircle, ShieldCheck, Sparkles, Terminal, User, XCircle } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { cn } from "@/lib/utils"
import type { TranscriptEntry } from "@/lib/demo-data"

type ChatTranscriptProps = {
  entries: TranscriptEntry[]
  showWorkingIndicator?: boolean
  onApproveApproval?: (approvalId: string) => void
  onRejectApproval?: (approvalId: string) => void
  onRedirectApproval?: (approvalId: string, message: string) => void
  approvalBusy?: boolean
}

const toolStatusLabel: Record<Extract<TranscriptEntry, { type: "tool" }>["status"], string> = {
  running: "Running",
  "awaiting-approval": "Awaiting approval",
  completed: "Completed",
}

export function ChatTranscript({
  entries,
  showWorkingIndicator = false,
  onApproveApproval,
  onRejectApproval,
  onRedirectApproval,
  approvalBusy = false,
}: ChatTranscriptProps) {
  const [redirectDrafts, setRedirectDrafts] = useState<Record<string, string>>({})

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

  return (
    <div className="flex min-w-0 w-full flex-col space-y-3 px-3 py-3 md:px-4 md:py-4">
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
                      "mb-1.5 flex gap-3 px-1 text-[11px]",
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
                        : "w-full text-foreground"
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">{entry.content}</p>
                    ) : (
                      <div className="text-sm">
                        <ChatMarkdown content={entry.content} />
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
                        : "border-border/70 bg-card/70 p-3.5"
                    )}
                  >
                    {isCommand ? (
                      <p className="whitespace-pre-wrap break-words">{entry.content}</p>
                    ) : (
                      <div className="text-sm">
                        <ChatMarkdown content={entry.content} />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          }

          if (entry.type === "tool-preview") {
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="min-w-0 w-full rounded-[1.35rem] border border-dashed border-sky-500/40 bg-sky-500/5 p-3.5"
              >
                <div className="flex items-center gap-2 text-[11px] text-sky-600 dark:text-sky-300">
                  <Terminal className="size-3.5" />
                  <span>Tool preview</span>
                  <span className="text-muted-foreground">{entry.timestamp}</span>
                </div>
                <pre className="mt-2.5 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-background/80 px-3.5 py-2.5 font-mono text-sm leading-6 text-foreground">
                  {entry.content}
                </pre>
              </motion.div>
            )
          }

          if (entry.type === "tool") {
            const redirectValue = redirectDrafts[entry.id] ?? ""

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="min-w-0 w-full rounded-[1.35rem] border border-border/70 bg-card/70 p-3.5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    Tool
                  </Badge>
                  <Badge
                    variant={entry.status === "awaiting-approval" ? "default" : "secondary"}
                    className="rounded-full"
                  >
                    {toolStatusLabel[entry.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{entry.detail}</p>
                  </div>
                  {entry.status === "running" ? (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                  ) : entry.status === "awaiting-approval" ? (
                    <ShieldCheck className="size-4 text-amber-500" />
                  ) : (
                    <ShieldCheck className="size-4 text-primary" />
                  )}
                </div>
                <div className="mt-3 rounded-2xl bg-background/80 px-3.5 py-2.5 text-sm leading-6 text-muted-foreground">
                  <ChatMarkdown content={entry.output} />
                </div>

                {entry.status === "awaiting-approval" &&
                entry.approvalId &&
                (onApproveApproval || onRejectApproval || onRedirectApproval) ? (
                  <div className="mt-3 rounded-2xl border border-border/70 bg-background/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <ShieldCheck className="size-3.5" />
                      Approval required
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                      <Input
                        value={redirectValue}
                        onChange={(event) => updateRedirectDraft(entry.id, event.target.value)}
                        placeholder="Redirect with note instead of running this tool..."
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
                ) : null}
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
                "min-w-0 w-full rounded-[1.35rem] border p-3.5",
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
              <div className="mt-2.5 text-sm leading-6 text-muted-foreground">
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
              <div className="inline-flex items-center gap-1 rounded-[1.35rem] border border-border/70 bg-card/70 px-3.5 py-2.5 shadow-sm">
                <span className="size-2 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:-0.3s]" />
                <span className="size-2 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:-0.15s]" />
                <span className="size-2 rounded-full bg-muted-foreground/70 animate-pulse" />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

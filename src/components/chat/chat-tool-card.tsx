import { CheckCircle2, ChevronRight, LoaderCircle, ShieldCheck, Square } from "lucide-react"
import { useState } from "react"

import { CopyButton } from "@/components/chat/code-block"
import { ChatDetailDialog } from "@/components/chat/chat-detail-dialog"
import { Button } from "@/components/ui/button"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { formatToolCategory } from "@/features/chat/transcript-helpers"
import type { TranscriptEntry } from "@/lib/types"

type ToolEntry = Extract<TranscriptEntry, { type: "tool" }>

type ChatToolCardProps = {
  entry: ToolEntry
  approvalBusy?: boolean
  onApproveApproval?: (approvalId: string) => void
  onRejectApproval?: (approvalId: string) => void
  onStop?: () => void
}

export function ChatToolCard({
  entry,
  approvalBusy = false,
  onApproveApproval,
  onRejectApproval,
  onStop,
}: ChatToolCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const isRunning = entry.status === "running"
  const isAwaiting = entry.status === "awaiting-approval"
  const isCompleted = entry.status === "completed"
  const showOutput = isCompleted && entry.output && entry.output !== "Tool execution was skipped."
  const showArguments = Boolean(entry.argumentsText?.trim())

  return (
    <>
      <div className="min-w-0 w-full overflow-hidden rounded-lg border border-border/70 bg-card/70 shadow-sm">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5">
          {entry.step != null && (
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] tabular-nums bg-muted text-muted-foreground">
              {entry.maxSteps != null && entry.maxSteps > 1
                ? `step ${entry.step}/${entry.maxSteps}`
                : `step ${entry.step}`}
            </span>
          )}
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left font-mono text-xs"
            onClick={() => setDialogOpen(true)}
            title={entry.commandText}
          >
            <span className="font-semibold text-foreground">{entry.name}</span>
            <span className="text-muted-foreground"> {entry.commandText.slice(entry.name.length).trimStart()}</span>
          </button>
          <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:inline-flex">
            {formatToolCategory(entry.category)}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{entry.timestamp}</span>
          {isRunning ? (
            <LoaderCircle className="size-3.5 shrink-0 animate-spin text-amber-500" />
          ) : isAwaiting ? (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
              approval
            </span>
          ) : (
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
          )}
        </div>

        <div className="border-t border-border/50 px-2.5 py-1 text-[11px] text-muted-foreground">
          {isRunning ? <TextShimmer>{entry.statusMessage}</TextShimmer> : entry.statusMessage}
        </div>

        {isAwaiting && showArguments ? (
          <div className="border-t border-border/50">
            <details className="group/args">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
                <ShieldCheck className="size-2.5 text-amber-500" />
                <span>Arguments</span>
                <ChevronRight className="ml-auto size-3 transition-transform group-open/args:rotate-90" />
              </summary>
              <pre className="mx-2.5 mb-1.5 max-h-40 overflow-y-auto rounded-md bg-background/80 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                {entry.argumentsText}
              </pre>
            </details>

            {entry.approvalId && (onApproveApproval || onRejectApproval) ? (
              <div className="mx-2.5 mb-2 flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full h-7 px-3 text-xs"
                  disabled={approvalBusy}
                  onClick={() => onApproveApproval?.(entry.approvalId!)}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full h-7 px-3 text-xs"
                  disabled={approvalBusy}
                  onClick={() => onRejectApproval?.(entry.approvalId!)}
                >
                  Reject
                </Button>
                {onStop && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full h-7 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={approvalBusy}
                    onClick={onStop}
                  >
                    <Square className="size-3" />
                    Stop
                  </Button>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground/60">
                  or type below to redirect
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {showOutput ? (
          <details className="group/out border-t border-border/50">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
              <span>
                Output{entry.returnCode != null ? ` · exit ${entry.returnCode}` : ""}
              </span>
              <CopyButton text={entry.output ?? ""} />
              <ChevronRight className="ml-auto size-3 transition-transform group-open/out:rotate-90" />
            </summary>
            <pre className="mx-2.5 mb-1.5 max-h-52 resize-y overflow-y-auto rounded-md bg-background/80 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
              {entry.output}
            </pre>
          </details>
        ) : null}
      </div>

      <ChatDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={entry.name}
        description={entry.statusMessage}
        content={entry.argumentsText || entry.output || entry.commandText}
        contentLabel={entry.argumentsText ? "Arguments" : entry.output ? "Output" : "Command"}
      />
    </>
  )
}

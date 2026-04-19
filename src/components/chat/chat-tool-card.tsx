import { CheckCircle2, ChevronRight, LoaderCircle, ShieldCheck } from "lucide-react"
import { useState } from "react"

import { CopyButton } from "@/components/chat/code-block"
import { ChatDetailDialog } from "@/components/chat/chat-detail-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { formatToolCategory } from "@/features/chat/transcript-helpers"
import type { TranscriptEntry } from "@/lib/types"

type ToolEntry = Extract<TranscriptEntry, { type: "tool" }>

type ChatToolCardProps = {
  entry: ToolEntry
  redirectValue: string
  approvalBusy?: boolean
  onRedirectValueChange: (value: string) => void
  onApproveApproval?: (approvalId: string) => void
  onRejectApproval?: (approvalId: string) => void
  onRedirectApproval?: (approvalId: string, message: string) => void
}

export function ChatToolCard({
  entry,
  redirectValue,
  approvalBusy = false,
  onRedirectValueChange,
  onApproveApproval,
  onRejectApproval,
  onRedirectApproval,
}: ChatToolCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const isRunning = entry.status === "running"
  const isAwaiting = entry.status === "awaiting-approval"
  const isCompleted = entry.status === "completed"
  const showOutput = isCompleted && entry.output && entry.output !== "Tool execution was skipped."
  const showArguments = Boolean(entry.argumentsText?.trim())

  function submitRedirect() {
    if (!entry.approvalId || !onRedirectApproval) {
      return
    }
    const message = redirectValue.trim()
    if (!message) {
      return
    }
    onRedirectApproval(entry.approvalId, message)
  }

  return (
    <>
      <div className="min-w-0 w-full overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2">
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

        <div className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
          {isRunning ? <TextShimmer>{entry.statusMessage}</TextShimmer> : entry.statusMessage}
        </div>

        {isAwaiting && showArguments ? (
          <div className="border-t border-border/50">
            <details className="group/args">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
                <ShieldCheck className="size-3 text-amber-500" />
                <span>Arguments</span>
                <ChevronRight className="ml-auto size-3 transition-transform group-open/args:rotate-90" />
              </summary>
              <pre className="mx-3 mb-2 max-h-48 overflow-y-auto rounded-lg bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all">
                {entry.argumentsText}
              </pre>
            </details>
            {entry.approvalId && (onApproveApproval || onRejectApproval || onRedirectApproval) ? (
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
                    onChange={(event) => onRedirectValueChange(event.target.value)}
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
                    onClick={submitRedirect}
                  >
                    Redirect
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {showOutput ? (
          <details className="group/out border-t border-border/50">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
              <span>
                Output{entry.returnCode != null ? ` · exit ${entry.returnCode}` : ""}
              </span>
              <CopyButton text={entry.output ?? ""} />
              <ChevronRight className="ml-auto size-3 transition-transform group-open/out:rotate-90" />
            </summary>
            <pre className="mx-3 mb-2 max-h-64 resize-y overflow-y-auto rounded-lg bg-background/80 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-words">
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

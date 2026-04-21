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

function normalizeMultilineContent(value: string) {
  return value.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n")
}

function parseToolArguments(value?: string) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function getStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }
  return null
}

export function ChatToolCard({
  entry,
  approvalBusy = false,
  onApproveApproval,
  onRejectApproval,
  onStop,
}: ChatToolCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const normalizedOutput = entry.output ? normalizeMultilineContent(entry.output) : undefined
  const parsedArguments = parseToolArguments(entry.argumentsText)
  const writeFileContent = parsedArguments
    ? getStringField(parsedArguments, ["content", "text", "new_content", "body"])
    : null
  const writeFilePath = parsedArguments
    ? getStringField(parsedArguments, ["path", "file_path", "filepath", "target_file"])
    : null
  const isWriteFilePreview =
    entry.category === "file" &&
    /write|edit|create|overwrite|replace/i.test(entry.name) &&
    Boolean(writeFileContent)
  const metadataArgumentsText = (() => {
    if (!parsedArguments || !isWriteFilePreview) {
      return entry.argumentsText
    }

    const nextArguments = { ...parsedArguments }
    delete nextArguments.content
    delete nextArguments.text
    delete nextArguments.new_content
    delete nextArguments.body
    return Object.keys(nextArguments).length > 0
      ? JSON.stringify(nextArguments, null, 2)
      : undefined
  })()

  const isRunning = entry.status === "running"
  const isAwaiting = entry.status === "awaiting-approval"
  const isCompleted = entry.status === "completed"
  const showOutput = isCompleted && normalizedOutput && normalizedOutput !== "Tool execution was skipped."
  const showArguments = Boolean(metadataArgumentsText?.trim())

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
            className="min-w-0 flex-1 truncate text-left font-mono text-[11px] leading-4"
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

        <div className="border-t border-border/50 px-2.5 py-1 text-[10px] leading-4 text-muted-foreground">
          {isRunning ? <TextShimmer>{entry.statusMessage}</TextShimmer> : entry.statusMessage}
        </div>

        {isAwaiting && showArguments ? (
          <div className="border-t border-border/50">
            {isWriteFilePreview ? (
              <div className="mx-2.5 mt-2 rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                      File draft
                    </p>
                    <p className="truncate font-mono text-[11px] leading-4 text-foreground/85" title={writeFilePath ?? undefined}>
                      {writeFilePath ?? entry.name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => setDialogOpen(true)}
                  >
                    Preview
                  </Button>
                </div>
              </div>
            ) : null}
            <details className="group/args">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground">
                <ShieldCheck className="size-2.5 text-amber-500" />
                <span>{isWriteFilePreview ? "Metadata" : "Arguments"}</span>
                <ChevronRight className="ml-auto size-3 transition-transform group-open/args:rotate-90" />
              </summary>
              <pre className="mx-2.5 mb-1.5 max-h-40 overflow-y-auto rounded-md bg-background/80 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                {metadataArgumentsText}
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
              <pre className="mx-2.5 mb-1.5 max-h-52 resize-y overflow-y-auto rounded-md bg-background/80 px-2.5 py-1.5 font-mono text-[11px] leading-4 text-muted-foreground whitespace-pre-wrap break-words">
                {normalizedOutput}
              </pre>
          </details>
        ) : null}
      </div>

      <ChatDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={entry.name}
        description={entry.statusMessage}
        content={isWriteFilePreview ? writeFileContent ?? entry.commandText : entry.argumentsText || normalizedOutput || entry.commandText}
        contentLabel={
          isWriteFilePreview
            ? (writeFilePath ? `Preview · ${writeFilePath}` : "Preview")
            : entry.argumentsText ? "Arguments" : entry.output ? "Output" : "Command"
        }
      />
    </>
  )
}

import { AnimatePresence, motion } from "motion/react"
import { Sparkles, XCircle } from "lucide-react"
import { useState } from "react"

import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { ChatMessageRow } from "@/components/chat/chat-message-row"
import { ChatToolCard } from "@/components/chat/chat-tool-card"
import { ChatToolPreviewCard } from "@/components/chat/chat-tool-preview-card"
import { ChatTurnSummaryRow } from "@/components/chat/chat-turn-summary-row"
import { ChatWorkingIndicator } from "@/components/chat/chat-working-indicator"
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
  onStop?: () => void
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
  onStop,
  approvalBusy = false,
}: ChatTranscriptProps) {
  const [openPreviewId, setOpenPreviewId] = useState<string | null>(null)
  const lastEntry = entries[entries.length - 1]
  const hasInlineGenerationStatus =
    lastEntry?.type === "tool-preview" ||
    (lastEntry?.type === "tool" && lastEntry.status !== "completed") ||
    (lastEntry?.type === "message" && lastEntry.role === "assistant")
  const shouldShowWorkingIndicator =
    showWorkingIndicator && !(isStreaming && hasInlineGenerationStatus)

  return (
    <div className="flex min-w-0 w-full flex-col space-y-1.5 px-2 py-1.5 md:px-3 md:py-2">
      <AnimatePresence initial={false}>
        {entries.map((entry, index) => {
          if (entry.type === "message") {
            return <ChatMessageRow key={entry.id} entry={entry} />
          }

          if (entry.type === "slash") {
            return (
              <ChatMessageRow
                key={entry.id}
                entry={{
                  id: entry.id,
                  type: "message",
                  role: entry.variant === "command" ? "user" : "assistant",
                  content: entry.content,
                  timestamp: entry.timestamp,
                }}
              />
            )
          }

          if (entry.type === "tool-preview") {
            const isLast = entries[entries.length - 1]?.id === entry.id
            return (
              <ChatToolPreviewCard
                key={entry.id}
                entry={entry}
                isGenerating={isStreaming && isLast}
                open={openPreviewId === entry.id}
                onOpenChange={(open) => setOpenPreviewId(open ? entry.id : null)}
              />
            )
          }

          if (entry.type === "tool") {
            return (
              <ChatToolCard
                key={`${entry.id}-${index}`}
                entry={entry}
                approvalBusy={approvalBusy}
                onApproveApproval={onApproveApproval}
                onRejectApproval={onRejectApproval}
                onStop={onStop}
              />
            )
          }

          if (entry.type === "turn-summary") {
            if (!advancedMode) return null
            return <ChatTurnSummaryRow key={entry.id} entry={entry} />
          }

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={cn(
                "min-w-0 w-full rounded-lg border px-2.5 py-1.5",
                entry.label === "Error"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-dashed border-primary/30 bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[10px]",
                  entry.label === "Error" ? "text-destructive" : "text-primary"
                )}
              >
                {entry.label === "Error" ? <XCircle className="size-3" /> : <Sparkles className="size-3" />}
                <span>{entry.label}</span>
                <span className="text-muted-foreground">{entry.timestamp}</span>
              </div>
              <div className="mt-1 text-xs leading-4 text-muted-foreground">
                <ChatMarkdown content={entry.content} />
              </div>
            </motion.div>
          )
        })}

        {shouldShowWorkingIndicator ? <ChatWorkingIndicator label={workingLabel} /> : null}
      </AnimatePresence>
    </div>
  )
}

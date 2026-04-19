import { Terminal } from "lucide-react"
import { motion } from "motion/react"

import { CopyButton } from "@/components/chat/code-block"
import { ChatDetailDialog } from "@/components/chat/chat-detail-dialog"
import { TextShimmer } from "@/components/ui/text-shimmer"
import type { TranscriptEntry } from "@/lib/types"

type ToolPreviewEntry = Extract<TranscriptEntry, { type: "tool-preview" }>

type ChatToolPreviewCardProps = {
  entry: ToolPreviewEntry
  isGenerating: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatToolPreviewCard({
  entry,
  isGenerating,
  open,
  onOpenChange,
}: ChatToolPreviewCardProps) {
  const dialogDescription =
    entry.content
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) === entry.commandText
      ? undefined
      : entry.commandText

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="min-w-0 w-full overflow-hidden rounded-xl border border-dashed border-primary/25 bg-primary/5"
      >
        <div className="flex items-center gap-2 px-3 py-2 text-[11px]">
          <Terminal className="size-3.5 shrink-0 text-primary/60" />
          <span className="flex-1 font-medium">
            {isGenerating ? (
              <TextShimmer className="text-primary/70">Generating tool call…</TextShimmer>
            ) : (
              <span className="text-primary/70">Tool preview</span>
            )}
          </span>
          <span className="truncate text-primary/50 max-sm:hidden">{entry.commandText}</span>
          <span className="text-muted-foreground">{entry.timestamp}</span>
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            View
          </button>
          <CopyButton text={entry.content} />
        </div>
      </motion.div>

      <ChatDetailDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Tool preview"
        description={dialogDescription}
        content={entry.content}
      />
    </>
  )
}

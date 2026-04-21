import { Terminal } from "lucide-react"
import { motion } from "motion/react"

import { ChatDetailDialog } from "@/components/chat/chat-detail-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const normalizedContent = entry.content.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n")
  const previewLineCount = normalizedContent.split("\n").length
  const dialogDescription =
    normalizedContent
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
        <div className="flex items-center gap-1.5 border-b border-primary/10 px-3 py-2 text-[10px]">
          <Terminal className="size-3 shrink-0 text-primary/60" />
          <span className="flex-1 font-medium text-primary/70">Tool preview</span>
          <span className="text-muted-foreground">{entry.timestamp}</span>
        </div>

        <div className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-background/75 px-2 py-1 text-[10px] text-primary/85">
              <span className="size-1.5 rounded-full bg-primary/60 animate-pulse" />
              {isGenerating ? <TextShimmer>Generating tool call</TextShimmer> : <span>Tool call ready</span>}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(true)}
              className="inline-flex items-center rounded-full border border-border/70 bg-background/85 px-2.5 py-1 text-[10px] font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              {isGenerating ? "View live draft" : "View draft"}
            </button>
          </div>

          <div className="mt-2 rounded-lg border border-border/60 bg-background/75 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                Preview
              </p>
              <p className="text-[10px] text-muted-foreground/75">
                {isGenerating ? "Live draft" : "Latest draft"}
              </p>
            </div>
            <ScrollArea className="mt-1.5 max-h-40 rounded-md">
              <pre className="whitespace-pre-wrap break-words pr-3 font-mono text-[11px] leading-4 text-foreground/85">
                {normalizedContent}
              </pre>
            </ScrollArea>
            {previewLineCount > 8 || normalizedContent.length > 500 ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground/75">
                Open the draft to inspect the full content.
              </p>
            ) : null}
          </div>
        </div>
      </motion.div>

      <ChatDetailDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Tool preview"
        description={dialogDescription}
        content={normalizedContent}
      />
    </>
  )
}

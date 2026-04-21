import { CopyButton } from "@/components/chat/code-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ChatDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  content: string
  contentLabel?: string
}

function normalizeMultilineContent(value: string) {
  return value.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n")
}

export function ChatDetailDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
  contentLabel = "Details",
}: ChatDetailDialogProps) {
  const normalizedContent = normalizeMultilineContent(content)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-1">{description}</DialogDescription>
              ) : null}
            </div>
            <CopyButton text={normalizedContent} />
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-2 px-5 py-4">
          <div className="text-sm font-medium text-foreground/80">
            {contentLabel}
          </div>
          <pre className="max-h-[65vh] overflow-auto rounded-xl border border-border/70 bg-background/70 p-3 font-mono text-xs text-foreground whitespace-pre-wrap break-words">
            {normalizedContent}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}

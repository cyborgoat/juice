import { Bot } from "lucide-react"
import { motion } from "motion/react"

import { TextShimmer } from "@/components/ui/text-shimmer"

export function ChatWorkingIndicator({ label }: { label: string }) {
  return (
    <motion.div
      key={`assistant-working-${label}`}
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
          <TextShimmer className="text-xs">{label}</TextShimmer>
        </div>
      </div>
    </motion.div>
  )
}

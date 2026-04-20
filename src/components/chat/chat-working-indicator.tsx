import { motion } from "motion/react"

import { JuiceMark } from "@/components/juice-mark"
import { TextShimmer } from "@/components/ui/text-shimmer"

function JuiceBadgeIcon() {
  return (
    <span className="inline-flex size-3 items-center justify-center">
      <JuiceMark className="block size-3 shrink-0" title="" />
    </span>
  )
}

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
        <div className="mb-0.5 flex w-full items-center gap-2 px-0.5 text-[10px] leading-none text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <JuiceBadgeIcon />
            <span className="translate-y-[0.5px] font-medium">Juice</span>
          </span>
          <span className="ml-auto shrink-0 tabular-nums">Now</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/70 px-2.5 py-1.5 shadow-sm">
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:-0.3s]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:-0.15s]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-pulse" />
          <TextShimmer className="text-xs">{label}</TextShimmer>
        </div>
      </div>
    </motion.div>
  )
}

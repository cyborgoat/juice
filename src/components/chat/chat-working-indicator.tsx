import { motion } from "motion/react"

import { TextShimmer } from "@/components/ui/text-shimmer"

function JuiceBadgeIcon() {
  return (
    <span className="inline-flex size-3 items-center justify-center">
      <svg
        width="12"
        height="12"
        viewBox="0 0 14 14"
        fill="none"
        className="block shrink-0"
        aria-hidden="true"
      >
        <path d="M9 4 L10.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M3.5 4h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M4 4h6l-1 8.5H5L4 4Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
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

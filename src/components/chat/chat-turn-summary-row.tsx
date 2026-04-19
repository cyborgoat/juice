import { motion } from "motion/react"

import type { TranscriptEntry } from "@/lib/types"

type TurnSummaryEntry = Extract<TranscriptEntry, { type: "turn-summary" }>

export function ChatTurnSummaryRow({ entry }: { entry: TurnSummaryEntry }) {
  const hasMeta =
    entry.steps > 0 || entry.toolsCalled > 0 || entry.tokensUsed > 0 || entry.errorCount > 0
  if (!hasMeta) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex w-full items-center justify-center py-1"
    >
      <div className="flex items-center gap-2 rounded-full border border-dashed border-primary/25 bg-primary/5 px-3 py-1 text-[11px] text-muted-foreground">
        {entry.steps > 0 && (
          <span><span className="font-semibold text-foreground/70">{entry.steps}</span> {entry.steps === 1 ? "step" : "steps"}</span>
        )}
        {entry.toolsCalled > 0 && (
          <><span className="opacity-40">·</span><span><span className="font-semibold text-foreground/70">{entry.toolsCalled}</span> {entry.toolsCalled === 1 ? "tool" : "tools"}</span></>
        )}
        {entry.tokensUsed > 0 && (
          <><span className="opacity-40">·</span><span><span className="font-semibold text-foreground/70">{entry.tokensUsed.toLocaleString()}</span> tokens</span></>
        )}
        {entry.errorCount > 0 && (
          <><span className="opacity-40">·</span><span className="text-destructive/80"><span className="font-semibold">{entry.errorCount}</span> {entry.errorCount === 1 ? "error" : "errors"}</span></>
        )}
        <span className="opacity-40">·</span>
        <span className="opacity-50">{entry.timestamp}</span>
      </div>
    </motion.div>
  )
}

import { Terminal } from "lucide-react"
import { motion } from "motion/react"

import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { CopyButton } from "@/components/chat/code-block"
import { cn } from "@/lib/utils"
import type { TranscriptEntry } from "@/lib/types"

type SlashEntry = Extract<TranscriptEntry, { type: "slash" }>

export function ChatSlashRow({ entry }: { entry: SlashEntry }) {
  const isCommand = entry.variant === "command"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={cn("flex w-full min-w-0", isCommand ? "justify-end" : "justify-start")}
    >
      <div className={cn("min-w-0", isCommand ? "w-fit max-w-[min(88%,48rem)]" : "w-full")}>
        <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Terminal className="size-3.5" />
          <span>{isCommand ? "Slash command" : "Slash result"}</span>
          <span>{entry.timestamp}</span>
        </div>

        <div
          className={cn(
            "rounded-[1.35rem] border shadow-sm",
            isCommand
              ? "border-sky-500/20 bg-sky-500/10 px-3.5 py-2.5 font-mono text-sm text-foreground"
              : "group/slash border-border/70 bg-card/70 p-3.5"
          )}
        >
          {isCommand ? (
            <p className="whitespace-pre-wrap break-words">{entry.content}</p>
          ) : (
            <div className="text-sm">
              <ChatMarkdown content={entry.content} />
              <div className="mt-1 flex opacity-0 transition-opacity group-hover/slash:opacity-100">
                <CopyButton text={entry.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

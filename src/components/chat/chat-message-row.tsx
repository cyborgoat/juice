import { User } from "lucide-react"
import { motion } from "motion/react"

import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { CopyButton } from "@/components/chat/code-block"
import { cn } from "@/lib/utils"
import type { TranscriptEntry } from "@/lib/types"

type MessageEntry = Extract<TranscriptEntry, { type: "message" }>

export function ChatMessageRow({ entry }: { entry: MessageEntry }) {
  const isUser = entry.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={cn("flex w-full min-w-0", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("flex min-w-0 w-full flex-col", isUser ? "items-end" : "max-w-none items-start")}>
        <div className={cn("mb-0.5 flex gap-2 px-0.5 text-[10px]", isUser ? "text-primary/80" : "text-muted-foreground")}>
          <span className="inline-flex items-center gap-1">
            {isUser ? <User className="size-3" /> : (
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ verticalAlign: "middle" }}>
                {/* straw */}
                <path d="M9 4 L10.5 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                {/* cup rim */}
                <path d="M3.5 4h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                {/* cup body */}
                <path d="M4 4h6l-1 8.5H5L4 4Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
              </svg>
            )}
            {isUser ? "You" : "Juice"}
          </span>
          <span className={cn(!isUser && "ml-auto")}>{entry.timestamp}</span>
        </div>
        <div
          className={cn(
            "max-w-full px-0 py-0",
            isUser
              ? "w-fit min-w-[12rem] max-w-[min(85%,44rem)] rounded-xl border border-primary/20 bg-primary px-3 py-1.5 text-primary-foreground shadow-sm"
              : "group/msg w-full text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-xs leading-5">{entry.content}</p>
          ) : (
            <div className="text-xs">
              <ChatMarkdown content={entry.content} />
              <div className="mt-0.5 flex opacity-0 transition-opacity group-hover/msg:opacity-100">
                <CopyButton text={entry.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

import { Bot, User } from "lucide-react"
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
        <div className={cn("mb-1 flex gap-3 px-1 text-[11px]", isUser ? "text-primary/80" : "text-muted-foreground")}>
          <span className="inline-flex items-center gap-1.5">
            {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            {isUser ? "You" : "Juice"}
          </span>
          <span className={cn(!isUser && "ml-auto")}>{entry.timestamp}</span>
        </div>
        <div
          className={cn(
            "max-w-full px-0 py-0",
            isUser
              ? "w-fit min-w-[16rem] max-w-[min(85%,44rem)] rounded-[1.35rem] border border-primary/20 bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm"
              : "group/msg w-full text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-6">{entry.content}</p>
          ) : (
            <div className="text-sm">
              <ChatMarkdown content={entry.content} />
              <div className="mt-1 flex opacity-0 transition-opacity group-hover/msg:opacity-100">
                <CopyButton text={entry.content} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

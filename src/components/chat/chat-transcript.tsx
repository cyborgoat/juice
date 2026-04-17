import { AnimatePresence, motion } from "motion/react"
import { Bot, LoaderCircle, ShieldCheck, Sparkles, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { cn } from "@/lib/utils"
import type { TranscriptEntry } from "@/lib/demo-data"

type ChatTranscriptProps = {
  entries: TranscriptEntry[]
}

const toolStatusLabel: Record<Extract<TranscriptEntry, { type: "tool" }>["status"], string> = {
  running: "Running",
  "awaiting-approval": "Awaiting approval",
  completed: "Completed",
}

export function ChatTranscript({ entries }: ChatTranscriptProps) {
  return (
    <div className="flex min-w-0 w-full flex-col space-y-3 px-3 py-3 md:px-4 md:py-4">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          if (entry.type === "message") {
            const isUser = entry.role === "user"

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn("flex w-full min-w-0", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "flex min-w-0 w-full flex-col",
                    isUser
                      ? "items-end"
                      : "max-w-none items-start"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1.5 flex gap-3 px-1 text-[11px]",
                      isUser ? "text-primary/80" : "text-muted-foreground"
                    )}
                  >
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
                        : "w-full text-foreground"
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">{entry.content}</p>
                    ) : (
                      <div className="text-sm">
                        <ChatMarkdown content={entry.content} />
                      </div>
                    )}
                  </div>
                 </div>
              </motion.div>
            )
          }

          if (entry.type === "tool") {
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="min-w-0 w-full rounded-[1.35rem] border border-border/70 bg-card/70 p-3.5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    Tool
                  </Badge>
                  <Badge
                    variant={entry.status === "awaiting-approval" ? "default" : "secondary"}
                    className="rounded-full"
                  >
                    {toolStatusLabel[entry.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{entry.detail}</p>
                  </div>
                  {entry.status === "running" ? (
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ShieldCheck className="size-4 text-primary" />
                  )}
                </div>
                <p className="mt-3 rounded-2xl bg-background/80 px-3.5 py-2.5 text-sm leading-6 text-muted-foreground">
                  {entry.output}
                </p>
              </motion.div>
            )
          }

          return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="min-w-0 w-full rounded-[1.35rem] border border-dashed border-primary/30 bg-primary/5 p-3.5"
              >
              <div className="flex items-center gap-2 text-[11px] text-primary">
                <Sparkles className="size-3.5" />
                <span>{entry.label}</span>
                <span className="text-muted-foreground">{entry.timestamp}</span>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                {entry.content}
              </p>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

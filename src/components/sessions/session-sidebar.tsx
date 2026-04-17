import { motion } from "motion/react"
import { MessageSquarePlus, Search, Settings2, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { SessionSummary } from "@/lib/demo-data"

type SessionSidebarProps = {
  sessions: SessionSummary[]
  selectedSessionId: string
  isOpen: boolean
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onClose: () => void
}

export function SessionSidebar({
  sessions,
  selectedSessionId,
  isOpen,
  onSelectSession,
  onCreateSession,
  onClose,
}: SessionSidebarProps) {
  const [query, setQuery] = useState("")

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return sessions
    }

    return sessions.filter((session) =>
      `${session.title} ${session.workspace} ${session.preview}`
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [query, sessions])

  return (
    <aside
      className={cn(
        "absolute inset-y-0 left-0 z-30 flex w-[272px] min-h-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/90 shadow-2xl backdrop-blur-xl transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="space-y-3 border-b border-sidebar-border/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Juice
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
              Sessions
            </h1>
          </div>
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={onClose}>
            <X className="size-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <Button className="h-8 w-full justify-between rounded-xl px-3" size="sm" onClick={onCreateSession}>
          New
          <MessageSquarePlus className="size-4" />
        </Button>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions"
            className="h-9 rounded-xl border-sidebar-border bg-background/70 pl-9"
          />
        </div>
      </div>

      <div className="px-3 pt-2 text-[11px] text-muted-foreground">
        {filteredSessions.length} sessions
      </div>

      <ScrollArea className="min-h-0 flex-1 overflow-hidden px-2 py-2">
        <div className="space-y-1 pb-2">
          {filteredSessions.map((session, index) => {
            const isActive = session.id === selectedSessionId

            return (
              <motion.button
                key={session.id}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.24 }}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-primary/10 text-sidebar-foreground"
                    : "text-sidebar-foreground hover:bg-background/70"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    session.status === "live"
                      ? "bg-emerald-500"
                      : session.status === "ready"
                        ? "bg-sky-400"
                        : "bg-muted-foreground/50"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {session.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {session.messageCount}
                </span>
                {isActive ? (
                  <span className="shrink-0 text-[11px] text-primary">Active</span>
                ) : null}
              </motion.button>
            )
          })}

          {!filteredSessions.length ? (
            <div className="rounded-xl border border-dashed border-sidebar-border bg-background/40 p-4 text-sm leading-5 text-muted-foreground">
              No sessions match <span className="font-medium text-foreground">“{query}”</span>.
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border/70 p-3">
        <Button variant="outline" size="sm" className="h-8 w-full justify-between rounded-xl">
          Settings
          <Settings2 className="size-4" />
        </Button>
      </div>
    </aside>
  )
}

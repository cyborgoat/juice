import { motion } from "motion/react"
import { MessageSquarePlus, Search, Settings2, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenuAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { JuiceMark } from "@/components/juice-mark"
import { cn } from "@/lib/utils"
import type { SessionSummary } from "@/lib/types"

function JuiceSidebarMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-2xl border border-sidebar-border/70 bg-background/80 text-sidebar-foreground shadow-sm">
      <JuiceMark className="block size-4 shrink-0" title="" />
    </div>
  )
}

type SessionSidebarProps = {
  sessions: SessionSummary[]
  selectedSessionId: string
  currentView?: "chat" | "settings"
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onOpenSettings: () => void
  onDeleteSession?: (sessionId: string) => void
  isMutatingSession?: boolean
}

export function SessionSidebar({
  sessions,
  selectedSessionId,
  currentView = "chat",
  onSelectSession,
  onCreateSession,
  onOpenSettings,
  onDeleteSession,
  isMutatingSession = false,
}: SessionSidebarProps) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [query, setQuery] = useState("")

  function handleCloseSidebar() {
    if (isMobile) {
      setOpenMobile(false)
      return
    }

    setOpen(false)
  }

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
    <Sidebar
      collapsible="offcanvas"
      className="z-30 [&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:border-sidebar-border/70 [&_[data-slot=sidebar-inner]]:bg-sidebar/90 [&_[data-slot=sidebar-inner]]:shadow-2xl [&_[data-slot=sidebar-inner]]:backdrop-blur-xl"
    >
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <JuiceSidebarMark />
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-[0.01em] text-muted-foreground/75">
                Juice
              </p>
              <h1 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-sidebar-foreground">
                Workspace Sessions
              </h1>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground/80" onClick={handleCloseSidebar}>
            <X className="size-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <Button className="h-9 w-full justify-between rounded-2xl px-3.5 text-[13px] font-semibold shadow-sm" size="sm" onClick={onCreateSession}>
          New chat
          <MessageSquarePlus className="size-4" />
        </Button>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions"
            className="h-9 rounded-xl border-sidebar-border bg-background/70 pl-9"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="min-h-0 px-2 pb-2">
        <SidebarMenu className="gap-1 py-2">
          {filteredSessions.map((session, index) => {
            const isActive = session.id === selectedSessionId

            return (
              <SidebarMenuItem key={session.id}>
            <motion.div
                  className="group/session"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.24 }}
                >
                  <SidebarMenuButton
                    type="button"
                    isActive={isActive}
                    tooltip={session.title}
                    onClick={() => onSelectSession(session.id)}
                    className="h-auto rounded-2xl px-2.5 py-2.5"
                  >
                    <span
                      className={cn(
                        "mt-0.5 size-2 shrink-0 rounded-full ring-2 ring-background/80",
                        session.status === "live"
                          ? "bg-emerald-500"
                          : session.status === "ready"
                            ? "bg-sky-400"
                            : "bg-amber-400"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold tracking-[-0.01em]">
                        {session.title}
                      </span>
                      <span className="block truncate pt-0.5 text-[11px] text-muted-foreground/80">
                        {session.preview}
                      </span>
                    </span>
                    {session.hasPendingApproval ? (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium tracking-[0.01em] text-amber-600 dark:text-amber-400">
                        approval
                      </span>
                    ) : null}
                  </SidebarMenuButton>

                  {onDeleteSession ? (
                    <SidebarMenuAction
                      type="button"
                      showOnHover
                      className="inset-y-0 right-1 my-auto h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                      disabled={isMutatingSession}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Delete session</span>
                    </SidebarMenuAction>
                  ) : null}
                </motion.div>
              </SidebarMenuItem>
            )
           })}

          {!filteredSessions.length ? (
            query ? (
              <div className="rounded-xl border border-dashed border-sidebar-border bg-background/40 p-4 text-sm leading-5 text-muted-foreground">
                No sessions match <span className="font-medium text-foreground">“{query}”</span>.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sidebar-border bg-background/40 px-4 py-8 text-center">
                <MessageSquarePlus className="size-8 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground/80">No sessions yet</p>
                  <p className="text-xs text-muted-foreground">
                    Create a new session to start chatting.
                  </p>
                </div>
              </div>
            )
          ) : null}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              isActive={currentView === "settings"}
              onClick={onOpenSettings}
              className="h-9 rounded-2xl text-[13px] font-medium"
            >
              <Settings2 className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Search,
} from "lucide-react"

type CommandPaletteAction = {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  onSelect: () => void
}

type CommandPaletteProps = {
  actions: CommandPaletteAction[]
}

export function CommandPalette({ actions }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return actions
    return actions.filter((action) =>
      action.label.toLowerCase().includes(normalizedQuery)
    )
  }, [actions, query])

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelectedIndex(0)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        setOpen((prev) => !prev)
        setQuery("")
        setSelectedIndex(0)
      }

      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  function handleSelect(action: CommandPaletteAction) {
    setOpen(false)
    setQuery("")
    action.onSelect()
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex((idx) => Math.min(idx + 1, filtered.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex((idx) => Math.max(idx - 1, 0))
    } else if (event.key === "Enter" && filtered[selectedIndex]) {
      event.preventDefault()
      handleSelect(filtered[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-64 overflow-y-auto p-1.5">
          {filtered.length > 0 ? (
            filtered.map((action, index) => (
              <button
                key={action.id}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => handleSelect(action)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                  {action.icon}
                </span>
                <span className="flex-1">{action.label}</span>
                {action.shortcut && (
                  <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { type CommandPaletteAction }

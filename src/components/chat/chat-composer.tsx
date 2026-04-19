import { CornerDownLeft, Hash, Paperclip, Terminal } from "lucide-react"
import { type KeyboardEvent, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CubiclesSlashCommand, ToolReference } from "@/lib/cubicles-api/types"
import { cn } from "@/lib/utils"
import { getSlashSuggestions } from "@/lib/slash-autocomplete"

type ChatComposerProps = {
  onSubmit: (value: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  slashCommands?: CubiclesSlashCommand[]
  profileNames?: string[]
  sessions?: Array<{
    id: string
    title: string
  }>
  toolReferences?: ToolReference[]
}

export function ChatComposer({
  onSubmit,
  onStop,
  disabled = false,
  isStreaming = false,
  slashCommands = [],
  profileNames = [],
  sessions = [],
  toolReferences = [],
}: ChatComposerProps) {
  const [draft, setDraft] = useState("")
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)

  const slashSuggestions = useMemo(
    () =>
      getSlashSuggestions({
        draft,
        commands: slashCommands,
        profiles: profileNames,
        sessions,
      }),
    [draft, profileNames, sessions, slashCommands]
  )

  // Extract the current @ prefix being typed (e.g. "@my" → "my")
  const atPrefix = useMemo((): string | null => {
    const idx = draft.lastIndexOf("@")
    if (idx < 0) return null
    if (idx > 0 && !/\s/.test(draft[idx - 1]!)) return null
    const partial = draft.slice(idx + 1)
    if (/\s/.test(partial)) return null
    return partial
  }, [draft])

  const atSuggestions = useMemo(() => {
    if (atPrefix === null || toolReferences.length === 0) return []
    const prefix = atPrefix.toLowerCase()
    const atIdx = draft.lastIndexOf("@")
    const beforeAt = draft.slice(0, atIdx)
    return toolReferences
      .filter((ref) => ref.name.toLowerCase().startsWith(prefix))
      .slice(0, 8)
      .map((ref) => ({
        label: `@${ref.name}`,
        description: `[${ref.kind}] ${ref.description}`,
        nextValue: `${beforeAt}@${ref.name} `,
        isAt: true,
      }))
  }, [atPrefix, toolReferences, draft])

  const activeSuggestions = atSuggestions.length > 0 ? atSuggestions : slashSuggestions

  function submit() {
    const trimmedDraft = draft.trim()
    if (!trimmedDraft || disabled) {
      return
    }

    onSubmit(trimmedDraft)
    setDraft("")
    setSelectedSuggestionIndex(0)
  }

  function applySuggestion(index: number) {
    const suggestion = activeSuggestions[index]
    if (!suggestion) {
      return
    }

    setDraft(suggestion.nextValue)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      submit()
      return
    }

    if (!activeSuggestions.length) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedSuggestionIndex((currentIndex) =>
        currentIndex >= activeSuggestions.length - 1 ? 0 : currentIndex + 1
      )
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedSuggestionIndex((currentIndex) =>
        currentIndex <= 0 ? activeSuggestions.length - 1 : currentIndex - 1
      )
      return
    }

    if (
      event.key === "Tab" ||
      (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey)
    ) {
      event.preventDefault()
      applySuggestion(selectedSuggestionIndex)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setDraft(draft.trimEnd())
    }
  }

  const isSlashDraft = draft.trim().startsWith("/")
  const sendLabel = isSlashDraft ? "Run command" : "Send"

  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-card/85 p-3 shadow-2xl shadow-black/5 backdrop-blur">
      <div className="relative">
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setSelectedSuggestionIndex(0)
          }}
          onKeyDown={onKeyDown}
          disabled={disabled || isStreaming}
          placeholder="Message Juice, or start with / for Cubicles slash commands like /help or /memory show..."
          className="min-h-20 max-h-40 resize-none rounded-[1.15rem] border-border/70 bg-background/70 px-3.5 py-2.5 text-sm"
        />

        {activeSuggestions.length > 0 ? (
          <div className="absolute right-0 bottom-full left-0 z-10 mb-1.5 rounded-xl border border-border/80 bg-background/98 py-1 shadow-xl backdrop-blur">
            <div className="px-2.5 pb-0.5 pt-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {atSuggestions.length > 0 ? "References" : "Suggestions"}
            </div>
            {activeSuggestions.slice(0, 6).map((suggestion, index) => (
              <button
                key={`${suggestion.label}-${index}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  applySuggestion(index)
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-2.5 py-1 text-left text-xs transition-colors",
                  index === selectedSuggestionIndex
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/60 text-foreground/80"
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {"isAt" in suggestion ? (
                    <Hash className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <Terminal className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-medium">{suggestion.label}</span>
                </span>
                {suggestion.description ? (
                  <span className="max-w-[55%] truncate text-[11px] text-muted-foreground">
                    {suggestion.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full text-muted-foreground"
          disabled
        >
          <Paperclip className="size-4" />
          Attach
        </Button>
        <Button
          type="button"
          className="rounded-full px-4"
          onClick={isStreaming ? onStop : submit}
          disabled={disabled || (isStreaming && !onStop)}
        >
          {isStreaming ? "Stop" : sendLabel}
          <CornerDownLeft className="size-4" />
        </Button>
      </div>
    </div>
  )
}

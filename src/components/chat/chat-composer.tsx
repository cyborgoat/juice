import { CornerDownLeft, Paperclip, Sparkles } from "lucide-react"
import { type KeyboardEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ChatComposerProps = {
  onSubmit: (value: string) => void
  disabled?: boolean
  isStreaming?: boolean
}

export function ChatComposer({
  onSubmit,
  disabled = false,
  isStreaming = false,
}: ChatComposerProps) {
  const [draft, setDraft] = useState("")

  function submit() {
    const trimmedDraft = draft.trim()
    if (!trimmedDraft || disabled) {
      return
    }

    onSubmit(trimmedDraft)
    setDraft("")
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-card/85 p-3 shadow-2xl shadow-black/5 backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-3.5" />
          Chat composer
        </span>
        <span>Press Ctrl/Cmd + Enter to send</span>
      </div>

      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="Message Juice about sessions, workspace context, or the next desktop feature to build..."
        className="min-h-20 max-h-40 resize-none rounded-[1.15rem] border-border/70 bg-background/70 px-3.5 py-2.5 text-sm"
      />

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
          onClick={submit}
          disabled={disabled}
        >
          {isStreaming ? "Streaming…" : "Send to Juice"}
          <CornerDownLeft className="size-4" />
        </Button>
      </div>
    </div>
  )
}

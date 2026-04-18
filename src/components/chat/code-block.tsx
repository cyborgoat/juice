import { useState, useEffect, useCallback, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { codeToHtml } from "shiki"

type CodeBlockProps = {
  language?: string
  children: string
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-foreground/10 hover:text-muted-foreground"
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null)

  useEffect(() => {
    if (!language) return

    let cancelled = false
    codeToHtml(children, {
      lang: language,
      theme: "github-dark-default",
    })
      .then((html) => {
        if (!cancelled) setHighlighted(html)
      })
      .catch(() => {
        // fall back to plain text
      })

    return () => {
      cancelled = true
    }
  }, [children, language])

  return (
    <div className="group/code relative mt-3 overflow-hidden rounded-xl border border-border/70 bg-background/90">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          {language || "text"}
        </span>
        <CopyButton text={children} />
      </div>
      {highlighted ? (
        <div
          className="max-h-96 overflow-auto px-3 pb-2.5 pt-2 text-sm leading-6 [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className="max-h-96 overflow-auto px-3 pb-2.5 pt-2 text-sm leading-6">
          <code>{children}</code>
        </pre>
      )}
    </div>
  )
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  )
}

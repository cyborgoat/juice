import { useState } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeBlock, InlineCode } from "@/components/chat/code-block"

type ChatMarkdownProps = {
  content: string
}

type Segment = {
  type: "think" | "content"
  text: string
}

/** Must stay in sync with `transcript-helpers` stream + history markers. */
const THINK_OPEN = "<think>"
const THINK_CLOSE = "</think>"
const MARKDOWN_STACK_CLASS = "space-y-1"
const MARKDOWN_PARAGRAPH_CLASS = "leading-5 [&:not(:first-child)]:mt-1"
const MARKDOWN_LIST_CLASS = "mt-1 ml-5 space-y-0.5"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripToolBlocks(text: string) {
  let result = text.replace(/<tool>[\s\S]*?<\/tool>/g, "")
  const openIdx = result.lastIndexOf("<tool>")
  if (openIdx !== -1) {
    result = result.slice(0, openIdx)
  }
  return result
}

function normalizeContentSegment(text: string) {
  return text.replaceAll(THINK_OPEN, "").replaceAll(THINK_CLOSE, "")
}

function parseThinkBlocks(content: string): Segment[] {
  const cleaned = stripToolBlocks(content)
  const segments: Segment[] = []
  const re = new RegExp(
    `${escapeRegExp(THINK_OPEN)}([\\s\\S]*?)${escapeRegExp(THINK_CLOSE)}`,
    "g"
  )
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "content",
        text: normalizeContentSegment(cleaned.slice(lastIndex, match.index)),
      })
    }
    if (match[1].trim()) {
      segments.push({ type: "think", text: match[1] })
    }
    lastIndex = match.index + match[0].length
  }

  const rest = cleaned.slice(lastIndex)
  if (!rest) {
    return segments
  }

  // Live stream: thinking deltas append inside an open block before `</think>` exists.
  if (rest.startsWith(THINK_OPEN) && !rest.includes(THINK_CLOSE)) {
    const inner = rest.slice(THINK_OPEN.length)
    if (inner.trim()) {
      segments.push({ type: "think", text: inner })
    }
    return segments
  }

  segments.push({ type: "content", text: normalizeContentSegment(rest) })
  return segments
}

const markdownComponents: Components = {
  p: ({ children }) => <p className={MARKDOWN_PARAGRAPH_CLASS}>{children}</p>,
  ul: ({ children }) => <ul className={`${MARKDOWN_LIST_CLASS} list-disc`}>{children}</ul>,
  ol: ({ children }) => <ol className={`${MARKDOWN_LIST_CLASS} list-decimal`}>{children}</ol>,
  li: ({ children }) => <li className="leading-5">{children}</li>,
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
      <table className="min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/70 text-foreground">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border/70">{children}</tbody>,
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
  th: ({ children }) => (
    <th className="border-b border-border/70 px-3 py-2 font-medium tracking-wide">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-foreground/90">{children}</td>,
  h1: ({ children }) => <h1 className="mt-4 text-base font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-sm font-medium first:mt-0">{children}</h3>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border/70 pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border/70" />,
  code: ({ children, className }) => {
    const isInline =
      !className &&
      typeof children === "string" &&
      !children.includes("\n")

    if (isInline) {
      return <InlineCode>{children}</InlineCode>
    }

    const language = className?.match(/language-(\S+)/)?.[1]
    const text = typeof children === "string" ? children.replace(/\n$/, "") : String(children ?? "").replace(/\n$/, "")

    return <CodeBlock language={language}>{text}</CodeBlock>
  },
}

function ThinkBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          <path d="M2 1.5L5.5 4L2 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="tracking-wide uppercase font-medium">thinking</span>
      </button>
      {open && (
        <div className="mt-1 pl-3 border-l border-border/40 text-xs leading-5 text-muted-foreground/60">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const segments = parseThinkBlocks(content)

  return (
    <div className={MARKDOWN_STACK_CLASS}>
      {segments.map((segment, index) => {
        if (!segment.text.trim()) {
          return null
        }

        if (segment.type === "think") {
          return <ThinkBlock key={`think-${index}`} text={segment.text} />
        }

        return (
          <ReactMarkdown
            key={`content-${index}`}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {segment.text}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}

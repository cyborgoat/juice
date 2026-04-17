import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

type ChatMarkdownProps = {
  content: string
}

type Segment = {
  type: "think" | "content"
  text: string
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
  return text.replace(/<\/?think>/g, "")
}

function parseThinkBlocks(content: string): Segment[] {
  const cleaned = stripToolBlocks(content)
  const segments: Segment[] = []
  const re = /<think>([\s\S]*?)<\/think>/g
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
  if (rest) {
    segments.push({ type: "content", text: normalizeContentSegment(rest) })
  }

  return segments
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="leading-6 [&:not(:first-child)]:mt-3">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 ml-5 list-disc space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 ml-5 list-decimal space-y-1.5">{children}</ol>,
  li: ({ children }) => <li className="leading-6">{children}</li>,
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
      return (
        <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[0.9em]">
          {children}
        </code>
      )
    }

    return (
      <pre className="mt-3 overflow-x-auto rounded-xl bg-background/90 px-3 py-2.5 text-sm leading-6">
        <code className={className}>{children}</code>
      </pre>
    )
  },
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const segments = parseThinkBlocks(content)

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        if (!segment.text.trim()) {
          return null
        }

        if (segment.type === "think") {
          return (
            <details
              key={`think-${index}`}
              className="rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-muted-foreground"
            >
              <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.18em]">
                Thinking
              </summary>
              <div className="mt-2 text-sm text-muted-foreground/90">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {segment.text}
                </ReactMarkdown>
              </div>
            </details>
          )
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

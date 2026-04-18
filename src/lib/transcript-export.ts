import type { TranscriptEntry } from "@/lib/demo-data"

export function transcriptToMarkdown(entries: TranscriptEntry[], sessionTitle?: string): string {
  const lines: string[] = []

  if (sessionTitle) {
    lines.push(`# ${sessionTitle}`, "")
  }

  for (const entry of entries) {
    switch (entry.type) {
      case "message":
        lines.push(
          `### ${entry.role === "user" ? "You" : "Juice"} — ${entry.timestamp}`,
          "",
          entry.content,
          "",
        )
        break

      case "slash":
        if (entry.variant === "command") {
          lines.push(`> **Slash command**: \`${entry.content}\``, "")
        } else {
          lines.push(entry.content, "")
        }
        break

      case "tool":
        lines.push(
          `#### Tool: ${entry.name} (${entry.status})`,
          "",
          entry.detail,
          "",
          "```",
          entry.output,
          "```",
          "",
        )
        break

      case "tool-preview":
        lines.push("#### Tool preview", "", "```", entry.content, "```", "")
        break

      case "system":
        lines.push(`> **${entry.label}**: ${entry.content}`, "")
        break
    }
  }

  return lines.join("\n")
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

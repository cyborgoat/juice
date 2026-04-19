import type { TranscriptEntry } from "@/lib/types"

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

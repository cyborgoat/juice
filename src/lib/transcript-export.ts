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
          entry.statusMessage,
          "",
        )
        if (entry.argumentsText) {
          lines.push("```json", entry.argumentsText, "```", "")
        }
        if (entry.output) {
          lines.push("```", entry.output, "```", "")
        }
        break

      case "turn-summary":
        lines.push(
          `> Turn summary: ${entry.steps} step(s), ${entry.toolsCalled} tool(s), ${entry.tokensUsed} tokens, ${entry.errorCount} error(s)`,
          ""
        )
        break

      case "tool-preview":
        lines.push(`#### Tool preview`, "", "```", entry.content, "```", "")
        break

      case "system":
        lines.push(`> **${entry.label}**: ${entry.content}`, "")
        break
    }
  }

  return lines.join("\n")
}

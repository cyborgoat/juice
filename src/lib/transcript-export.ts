import { writeTextFile } from "@tauri-apps/plugin-fs"
import { downloadDir, join } from "@tauri-apps/api/path"
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

/** Saves content to the Downloads folder and returns the full file path. */
export async function saveToDownloads(content: string, filename: string): Promise<string> {
  const dir = await downloadDir()
  const filePath = await join(dir, filename)
  await writeTextFile(filePath, content)
  return filePath
}

import { writeTextFile, exists } from "@tauri-apps/plugin-fs"
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

/** Derives a safe, conflict-free filename by checking the Downloads folder. */
export async function transcriptFilename(title: string, dir: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10)
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  const base = slug || "transcript"

  // Try base name, then base-2, base-3, ...
  const candidate = (n?: number) =>
    n ? `${base}-${date}-${n}.md` : `${base}-${date}.md`

  let n: number | undefined
  while (true) {
    const name = candidate(n)
    const full = await join(dir, name)
    if (!(await exists(full))) return name
    n = (n ?? 1) + 1
  }
}

/** Saves content to the Downloads folder and returns the full file path. */
export async function saveToDownloads(content: string, sessionTitle: string): Promise<string> {
  const dir = await downloadDir()
  const filename = await transcriptFilename(sessionTitle, dir)
  const filePath = await join(dir, filename)
  await writeTextFile(filePath, content)
  return filePath
}

import { isTauri } from "@tauri-apps/api/core"

const STORAGE_KEY = "juice:working-directory"

export function readWorkingDirectory(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ""
  } catch {
    return ""
  }
}

export function persistWorkingDirectory(path: string): void {
  try {
    const t = path.trim()
    if (t) {
      localStorage.setItem(STORAGE_KEY, t)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

/** Native folder picker when running inside Tauri; returns null in browser or if cancelled. */
export async function pickWorkingDirectoryWithDialog(): Promise<string | null> {
  if (!isTauri()) {
    return null
  }
  const { open } = await import("@tauri-apps/plugin-dialog")
  const selected = await open({ directory: true, multiple: false })
  if (selected == null) {
    return null
  }
  const path = Array.isArray(selected) ? selected[0] : selected
  return path?.trim() ? path : null
}

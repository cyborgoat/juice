import { FolderOpen } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { pickWorkingDirectoryWithDialog } from "@/lib/working-directory"

type WorkingFolderTabProps = {
  workingDirectory: string
  onCommit: (path: string) => void | Promise<void>
  showFeedback: (message: string) => void
}

export function WorkingFolderTab({
  workingDirectory,
  onCommit,
  showFeedback,
}: WorkingFolderTabProps) {
  const [draft, setDraft] = useState(workingDirectory)

  async function handleBrowse() {
    const picked = await pickWorkingDirectoryWithDialog()
    if (picked) {
      setDraft(picked)
    }
  }

  function handleApply() {
    const next = draft.trim()
    if (!next) {
      showFeedback("Working folder path is required.")
      return
    }
    void onCommit(next)
    showFeedback("Working folder saved.")
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Working folder</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Cubicles runs tools and file access against a real directory. Juice remembers this path between
          launches. Trust for that folder is managed by Cubicles (see{" "}
          <span className="font-mono text-[11px]">cubicles trust</span>); the desktop server skips the
          interactive prompt.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="juice-working-folder">Absolute path</FieldLabel>
        <FieldContent>
          <div className="flex gap-2">
            <Input
              id="juice-working-folder"
              className="font-mono text-xs"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="/path/to/your/project"
              spellCheck={false}
            />
            <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => void handleBrowse()}>
              <FolderOpen className="mr-1.5 size-3.5" />
              Browse
            </Button>
          </div>
        </FieldContent>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleApply}>
          Save working folder
        </Button>
      </div>
    </div>
  )
}

import { useState } from "react"
import { ChevronRight } from "lucide-react"

import {
  scanCubiclesSkills,
  setCubiclesExtensionEnabled,
  setCubiclesSkillEnabled,
} from "@/lib/cubicles-api/client"
import type { CubiclesSkillResponse, CubiclesToolRecord } from "@/lib/cubicles-api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EmptyPanel } from "./shared"

type SkillsTabProps = {
  skills: CubiclesSkillResponse[] | undefined
  toolingProfileName: string
  onRefresh: () => Promise<void>
  showFeedback: (message: string) => void
}

export function SkillsTab({
  skills,
  toolingProfileName,
  onRefresh,
  showFeedback,
}: SkillsTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Skills</h2>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {skills?.length ?? 0}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={async () => {
            const scanned = await scanCubiclesSkills(toolingProfileName)
            await onRefresh()
            showFeedback(`Scanned ${scanned.discovered.length} skills.`)
          }}
        >
          Scan
        </Button>
      </div>

      <div className="space-y-1">
        {skills?.length ? (
          skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              onToggle={async () => {
                await setCubiclesSkillEnabled(
                  skill.name,
                  !skill.enabled,
                  toolingProfileName
                )
                await onRefresh()
                showFeedback(
                  `${skill.enabled ? "Disabled" : "Enabled"} skill '${skill.name}'.`
                )
              }}
            />
          ))
        ) : (
          <EmptyPanel message="No skills are currently registered." />
        )}
      </div>
    </div>
  )
}

type ExtensionsTabProps = {
  extensions: CubiclesToolRecord[] | undefined
  onRefresh: () => Promise<void>
  showFeedback: (message: string) => void
}

export function ExtensionsTab({
  extensions,
  onRefresh,
  showFeedback,
}: ExtensionsTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Extensions</h2>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {extensions?.length ?? 0}
        </Badge>
      </div>

      <div className="space-y-1">
        {extensions?.length ? (
          extensions.map((extension) => (
            <ToolToggleCard
              key={extension.name}
              tool={extension}
              onToggle={async () => {
                await setCubiclesExtensionEnabled(extension.name, !extension.enabled)
                await onRefresh()
                showFeedback(
                  `${extension.enabled ? "Disabled" : "Enabled"} extension '${extension.name}'.`
                )
              }}
            />
          ))
        ) : (
          <EmptyPanel message="No extensions are currently registered." />
        )}
      </div>
    </div>
  )
}

type MemoryTabProps = {
  memoryData: { content: string; path: string } | undefined
  onSaveMemory: (content: string) => Promise<void>
  showFeedback: (message: string) => void
}

export function MemoryTab({
  memoryData,
  onSaveMemory,
  showFeedback,
}: MemoryTabProps) {
  if (!memoryData) {
    return (
      <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
        Loading memory document…
      </div>
    )
  }

  return (
    <MemoryEditor
      key={memoryData.path}
      initialContent={memoryData.content}
      path={memoryData.path}
      onFeedback={showFeedback}
      onSave={onSaveMemory}
    />
  )
}

type MemoryEditorProps = {
  initialContent: string
  path: string
  onFeedback: (message: string) => void
  onSave: (content: string) => Promise<void>
}

function MemoryEditor({
  initialContent,
  path,
  onFeedback,
  onSave,
}: MemoryEditorProps) {
  const [memoryDraft, setMemoryDraft] = useState(initialContent)

  async function handleSaveMemory() {
    await onSave(memoryDraft)
    onFeedback("Saved MEMORY.md.")
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Durable memory</h2>
      <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-1.5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">File</p>
        <p className="break-all text-xs">{path}</p>
      </div>
      <Textarea
        value={memoryDraft}
        onChange={(event) => setMemoryDraft(event.target.value)}
        className="min-h-[28rem] font-mono text-xs"
      />
      <div>
        <Button size="sm" onClick={() => void handleSaveMemory()}>Save MEMORY.md</Button>
      </div>
    </div>
  )
}

function SkillCard({
  skill,
  onToggle,
}: {
  skill: CubiclesSkillResponse
  onToggle: () => Promise<void>
}) {
  return (
    <Collapsible>
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left [&[data-state=open]>svg:first-child]:rotate-90">
          <ChevronRight className="size-3 shrink-0 text-muted-foreground transition-transform" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
        </CollapsibleTrigger>
        <Switch
          size="sm"
          checked={skill.enabled}
          onCheckedChange={() => void onToggle()}
        />
      </div>
      <CollapsibleContent>
        <div className="space-y-1.5 rounded-b-lg border border-t-0 border-border/50 bg-background/40 px-3 pb-2.5 pt-1.5">
          <p className="text-xs text-muted-foreground">{skill.description || "No description."}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Path: <span className="font-mono">{skill.path}</span></span>
            <span>Helpers: {skill.helperPaths.length}</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ToolToggleCard({
  tool,
  onToggle,
}: {
  tool: CubiclesToolRecord
  onToggle: () => Promise<void>
}) {
  return (
    <Collapsible>
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left [&[data-state=open]>svg:first-child]:rotate-90">
          <ChevronRight className="size-3 shrink-0 text-muted-foreground transition-transform" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{tool.name}</span>
        </CollapsibleTrigger>
        <Switch
          size="sm"
          checked={tool.enabled}
          onCheckedChange={() => void onToggle()}
        />
      </div>
      <CollapsibleContent>
        <div className="space-y-1.5 rounded-b-lg border border-t-0 border-border/50 bg-background/40 px-3 pb-2.5 pt-1.5">
          <p className="text-xs text-muted-foreground">{tool.description || "No description."}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Source: <span className="font-mono">{tool.source}</span></span>
            <span>Group: {tool.group}</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

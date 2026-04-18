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

export function HarnessTab() {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Agent Harness</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tunable hyperparameters live in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            ~/.cubicles/config/harness.json
          </code>
          . Edit the file and restart the backend to apply.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {HARNESS_FIELDS.map((field) => (
          <div key={field.key} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
            <p className="font-mono text-xs font-medium text-foreground">{field.key}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{field.description}</p>
            {field.default !== undefined && (
              <p className="mt-0.5 font-mono text-[11px] text-primary/80">default: {String(field.default)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const HARNESS_FIELDS: Array<{ key: string; description: string; default?: number | string }> = [
  { key: "max_steps", description: "Max agent loop iterations per turn", default: 15 },
  { key: "min_prompt_budget", description: "Absolute minimum prompt token budget", default: 16384 },
  { key: "default_context_window", description: "Fallback context window when profile omits it", default: 32768 },
  { key: "default_max_tokens", description: "Fallback max output tokens", default: 4096 },
  { key: "compression_threshold", description: "Context fill % that triggers auto-compression (0–1)", default: 0.85 },
  { key: "min_reserve_tokens", description: "Minimum tokens reserved for output & framing", default: 512 },
  { key: "reserve_multiplier", description: "Multiplier applied to max_output_tokens for reserve", default: 1.0 },
  { key: "stream_timeout_ms", description: "Stream inactivity timeout (ms)", default: 60000 },
  { key: "max_tool_output_tokens", description: "Max tokens kept per tool result in context", default: 8192 },
  { key: "max_read_file_bytes", description: "Max bytes read per file (0 = unlimited)", default: 0 },
  { key: "max_output_bytes", description: "Max combined stdout+stderr bytes per subprocess", default: 65536 },
  { key: "message_overhead_tokens", description: "Per-message overhead for role/delimiters", default: 8 },
]

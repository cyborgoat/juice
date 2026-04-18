import { useState } from "react"
import { Plus } from "lucide-react"

import {
  createCubiclesApi,
  deleteCubiclesApi,
  updateCubiclesApi,
} from "@/lib/cubicles-api/client"
import type { CubiclesApiParameter, CubiclesApiRecord } from "@/lib/cubicles-api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type ApiGroup = {
  group: string
  api_count: number
  enabled_count: number
}

type ApisTabProps = {
  apis: CubiclesApiRecord[] | undefined
  apiGroups: ApiGroup[] | undefined
  toolingProfileName: string
  onRefresh: () => Promise<void>
  showFeedback: (message: string) => void
}

export function ApisTab({
  apis,
  apiGroups,
  toolingProfileName,
  onRefresh,
  showFeedback,
}: ApisTabProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingApi, setEditingApi] = useState<CubiclesApiRecord | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">APIs</h2>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {apis?.length ?? 0}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-6 gap-1 rounded-md px-2 text-xs"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="size-3" />
          Register
        </Button>
      </div>

      {apiGroups?.length ? (
        <div className="flex flex-wrap gap-2">
          {apiGroups.map((group) => (
            <div key={group.group} className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2 py-1 text-xs">
              <span className="font-medium">{group.group}</span>
              <Badge variant="outline" className="h-4 rounded-full px-1 text-[10px]">
                {group.enabled_count}/{group.api_count}
              </Badge>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-1">
        {apis?.map((api) => (
          <ApiRow key={api.name} api={api} onEdit={() => setEditingApi(api)} />
        ))}
      </div>

      <ApiCreateDialog
        open={showCreate}
        toolingProfileName={toolingProfileName}
        onClose={() => setShowCreate(false)}
        onFeedback={showFeedback}
        onRefresh={onRefresh}
      />

      <ApiEditDialog
        api={editingApi}
        onClose={() => setEditingApi(null)}
        onFeedback={showFeedback}
        onRefresh={onRefresh}
      />
    </div>
  )
}

function ApiRow({ api, onEdit }: { api: CubiclesApiRecord; onEdit: () => void }) {
  return (
    <Collapsible>
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5 transition-colors hover:bg-background/70 [&:has([data-state=open])]:rounded-b-none [&:has([data-state=open])]:border-b-0">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left [&[data-state=open]>svg:first-child]:rotate-90">
          <svg className="size-3 shrink-0 text-muted-foreground transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{api.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{api.group}</span>
          <Badge variant={api.enabled ? "secondary" : "outline"} className="h-4 shrink-0 rounded-full px-1.5 text-[10px]">
            {api.enabled ? "on" : "off"}
          </Badge>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
        >
          <svg className="size-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          <span className="sr-only">Edit {api.name}</span>
        </Button>
      </div>
      <CollapsibleContent>
        <div className="rounded-b-lg border border-t-0 border-border/50 bg-background/40 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          {api.description || <span className="italic">No description.</span>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

type ApiCreateDialogProps = {
  open: boolean
  toolingProfileName: string
  onClose: () => void
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
}

function ApiCreateDialog({ open, toolingProfileName, onClose, onFeedback, onRefresh }: ApiCreateDialogProps) {
  const [name, setName] = useState("")
  const [group, setGroup] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [maxChars, setMaxChars] = useState("4000")
  const [parametersJson, setParametersJson] = useState("[]")

  async function handleCreate() {
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const trimmedUrl = url.trim()

    if (!trimmedName || !trimmedDescription || !trimmedUrl) {
      onFeedback("Name, description, and URL are required.")
      return
    }

    let parameters: CubiclesApiParameter[]
    try {
      parameters = JSON.parse(parametersJson) as CubiclesApiParameter[]
    } catch {
      onFeedback("Parameters JSON must be a valid array.")
      return
    }

    const max = Number(maxChars)
    if (!Number.isFinite(max) || max <= 0) {
      onFeedback("Max chars must be a positive number.")
      return
    }

    await createCubiclesApi({
      name: trimmedName,
      group: group.trim() || null,
      description: trimmedDescription,
      url: trimmedUrl,
      max_chars: Math.round(max),
      parameters,
      profile_name: toolingProfileName,
    })

    await onRefresh()
    onFeedback(`Created API '${trimmedName}'.`)
    setName(""); setGroup(""); setUrl(""); setDescription(""); setMaxChars("4000"); setParametersJson("[]")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Register API</DialogTitle>
        </DialogHeader>
        <FieldSet>
          <FieldGroup>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="create-api-name">Name</FieldLabel>
                <FieldContent><Input id="create-api-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="API name" /></FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="create-api-group">Group</FieldLabel>
                <FieldContent><Input id="create-api-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Optional" /></FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="create-api-url">URL</FieldLabel>
              <FieldContent><Input id="create-api-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/endpoint" /></FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="create-api-description">Description</FieldLabel>
              <FieldContent><Textarea id="create-api-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" placeholder="Describe what this API does" /></FieldContent>
            </Field>
            <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
              <Field>
                <FieldLabel htmlFor="create-api-max-chars">Max chars</FieldLabel>
                <FieldContent><Input id="create-api-max-chars" value={maxChars} onChange={(e) => setMaxChars(e.target.value)} placeholder="4000" /></FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="create-api-parameters">Parameters JSON</FieldLabel>
                <FieldContent><Textarea id="create-api-parameters" value={parametersJson} onChange={(e) => setParametersJson(e.target.value)} className="min-h-24 font-mono text-xs" placeholder='[{"name":"q","type":"string","required":true,"location":"query"}]' /></FieldContent>
              </Field>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleCreate()}>Register</Button>
              <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </DialogContent>
    </Dialog>
  )
}

type ApiEditDialogProps = {
  api: CubiclesApiRecord | null
  onClose: () => void
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
}

function ApiEditDialog({ api, onClose, onFeedback, onRefresh }: ApiEditDialogProps) {
  return (
    <Dialog open={api !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">{api?.name}</DialogTitle>
        </DialogHeader>
        {api ? (
          <ApiEditor key={api.name} api={api} onFeedback={onFeedback} onRefresh={onRefresh} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type ApiEditorProps = {
  api: CubiclesApiRecord
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
  onDone: () => void
}

function ApiEditor({ api, onFeedback, onRefresh, onDone }: ApiEditorProps) {
  const [groupDraft, setGroupDraft] = useState(api.group)
  const [descriptionDraft, setDescriptionDraft] = useState(api.description)
  const [urlDraft, setUrlDraft] = useState(api.url)
  const [maxCharsDraft, setMaxCharsDraft] = useState(String(api.max_chars))
  const [enabledDraft, setEnabledDraft] = useState(api.enabled)
  const [parametersDraft, setParametersDraft] = useState(JSON.stringify(api.parameters, null, 2))

  async function handleSaveApi() {
    let parameters: CubiclesApiParameter[]
    try {
      parameters = JSON.parse(parametersDraft) as CubiclesApiParameter[]
    } catch {
      onFeedback("Parameters JSON must be a valid array.")
      return
    }

    const maxChars = Number(maxCharsDraft)
    if (!Number.isFinite(maxChars) || maxChars <= 0) {
      onFeedback("Max chars must be a positive number.")
      return
    }

    await updateCubiclesApi(api.name, {
      group: groupDraft.trim() || null,
      description: descriptionDraft.trim(),
      url: urlDraft.trim(),
      enabled: enabledDraft,
      max_chars: Math.round(maxChars),
      parameters,
    })

    await onRefresh()
    onFeedback("API saved.")
    onDone()
  }

  async function handleDeleteApi() {
    await deleteCubiclesApi(api.name)
    await onRefresh()
    onFeedback(`Deleted API '${api.name}'.`)
    onDone()
  }

  return (
    <div className="space-y-3">
      <FieldGroup>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field>
            <FieldLabel htmlFor={`api-group-${api.name}`}>Group</FieldLabel>
            <FieldContent><Input id={`api-group-${api.name}`} value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)} placeholder="Group" /></FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={`api-maxchars-${api.name}`}>Max chars</FieldLabel>
            <FieldContent><Input id={`api-maxchars-${api.name}`} value={maxCharsDraft} onChange={(e) => setMaxCharsDraft(e.target.value)} placeholder="4000" /></FieldContent>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`api-url-${api.name}`}>URL</FieldLabel>
          <FieldContent><Input id={`api-url-${api.name}`} value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="URL" /></FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor={`api-description-${api.name}`}>Description</FieldLabel>
          <FieldContent><Textarea id={`api-description-${api.name}`} value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} className="min-h-20" /></FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor={`api-parameters-${api.name}`}>Parameters JSON</FieldLabel>
          <FieldContent><Textarea id={`api-parameters-${api.name}`} value={parametersDraft} onChange={(e) => setParametersDraft(e.target.value)} className="min-h-28 font-mono text-xs" /></FieldContent>
        </Field>
        <Field className="w-fit">
          <FieldLabel>Enabled</FieldLabel>
          <div className="flex h-9 items-center">
            <Switch checked={enabledDraft} onCheckedChange={setEnabledDraft} />
          </div>
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void handleSaveApi()}>Save</Button>
        <Button size="sm" variant="destructive" onClick={() => void handleDeleteApi()}>Delete</Button>
      </div>
    </div>
  )
}

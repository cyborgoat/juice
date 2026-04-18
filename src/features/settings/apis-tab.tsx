import { useState } from "react"
import { ChevronRight, Plus } from "lucide-react"

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
  effectiveSelectedApiName: string
  selectedApi: CubiclesApiRecord | null
  toolingProfileName: string
  onSelectApi: (name: string) => void
  onRefresh: () => Promise<void>
  showFeedback: (message: string) => void
}

export function ApisTab({
  apis,
  apiGroups,
  effectiveSelectedApiName,
  selectedApi,
  toolingProfileName,
  onSelectApi,
  onRefresh,
  showFeedback,
}: ApisTabProps) {
  const [newApiName, setNewApiName] = useState("")
  const [newApiGroup, setNewApiGroup] = useState("")
  const [newApiUrl, setNewApiUrl] = useState("")
  const [newApiDescription, setNewApiDescription] = useState("")
  const [newApiMaxChars, setNewApiMaxChars] = useState("4000")
  const [newApiParametersJson, setNewApiParametersJson] = useState("[]")

  async function handleCreateApi() {
    const trimmedName = newApiName.trim()
    const trimmedDescription = newApiDescription.trim()
    const trimmedUrl = newApiUrl.trim()

    if (!trimmedName || !trimmedDescription || !trimmedUrl) {
      showFeedback("API name, description, and URL are required.")
      return
    }

    let parameters: CubiclesApiParameter[]
    try {
      parameters = JSON.parse(newApiParametersJson) as CubiclesApiParameter[]
    } catch {
      showFeedback("API parameters JSON must be a valid array.")
      return
    }

    const maxChars = Number(newApiMaxChars)
    if (!Number.isFinite(maxChars) || maxChars <= 0) {
      showFeedback("API max chars must be a positive number.")
      return
    }

    await createCubiclesApi({
      name: trimmedName,
      group: newApiGroup.trim() || null,
      description: trimmedDescription,
      url: trimmedUrl,
      max_chars: Math.round(maxChars),
      parameters,
      profile_name: toolingProfileName,
    })

    await onRefresh()
    onSelectApi(trimmedName)
    setNewApiName("")
    setNewApiGroup("")
    setNewApiUrl("")
    setNewApiDescription("")
    setNewApiMaxChars("4000")
    setNewApiParametersJson("[]")
    showFeedback(`Created API '${trimmedName}'.`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">APIs</h2>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {apis?.length ?? 0}
        </Badge>
      </div>

      {/* API group summaries */}
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

      {/* Collapsible API list */}
      <div className="space-y-1">
        {apis?.map((api) => (
          <Collapsible key={api.name} open={effectiveSelectedApiName === api.name} onOpenChange={(open) => onSelectApi(open ? api.name : "")}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5 text-left transition-colors hover:bg-background/70 [&[data-state=open]]:rounded-b-none [&[data-state=open]]:border-b-0 [&[data-state=open]>svg:first-child]:rotate-90">
              <ChevronRight className="size-3 shrink-0 text-muted-foreground transition-transform" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{api.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{api.group}</span>
              <Badge variant={api.enabled ? "secondary" : "outline"} className="h-4 shrink-0 rounded-full px-1.5 text-[10px]">
                {api.enabled ? "on" : "off"}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-b-lg border border-t-0 border-border/50 bg-background/40 px-3 pb-3 pt-2">
                {selectedApi ? (
                  <ApiEditor
                    key={selectedApi.name}
                    api={selectedApi}
                    onFeedback={showFeedback}
                    onRefresh={onRefresh}
                    onSelectApi={onSelectApi}
                  />
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg]:rotate-90">
          <Plus className="size-3" />
          Register API
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border/50 bg-background/40 p-3">
            <FieldSet>
              <FieldGroup>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="new-api-name">API name</FieldLabel>
                    <FieldContent>
                      <Input
                        id="new-api-name"
                        value={newApiName}
                        onChange={(event) => setNewApiName(event.target.value)}
                        placeholder="API name"
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-api-group">Group</FieldLabel>
                    <FieldContent>
                      <Input
                        id="new-api-group"
                        value={newApiGroup}
                        onChange={(event) => setNewApiGroup(event.target.value)}
                        placeholder="Group (optional)"
                      />
                    </FieldContent>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="new-api-url">URL</FieldLabel>
                  <FieldContent>
                    <Input
                      id="new-api-url"
                      value={newApiUrl}
                      onChange={(event) => setNewApiUrl(event.target.value)}
                      placeholder="https://example.com/endpoint"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-api-description">Description</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="new-api-description"
                      value={newApiDescription}
                      onChange={(event) => setNewApiDescription(event.target.value)}
                      className="min-h-20"
                      placeholder="Describe what this API tool does"
                    />
                  </FieldContent>
                </Field>
                <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <Field>
                    <FieldLabel htmlFor="new-api-max-chars">Max chars</FieldLabel>
                    <FieldContent>
                      <Input
                        id="new-api-max-chars"
                        value={newApiMaxChars}
                        onChange={(event) => setNewApiMaxChars(event.target.value)}
                        placeholder="4000"
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-api-parameters">Parameters JSON</FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="new-api-parameters"
                        value={newApiParametersJson}
                        onChange={(event) => setNewApiParametersJson(event.target.value)}
                        className="min-h-24 font-mono text-xs"
                        placeholder='[{"name":"q","type":"string","required":true,"location":"query"}]'
                      />
                    </FieldContent>
                  </Field>
                </div>
                <div>
                  <Button size="sm" onClick={() => void handleCreateApi()}>Register API</Button>
                </div>
              </FieldGroup>
            </FieldSet>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

type ApiEditorProps = {
  api: CubiclesApiRecord
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
  onSelectApi: (name: string) => void
}

function ApiEditor({ api, onFeedback, onRefresh, onSelectApi }: ApiEditorProps) {
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
      onFeedback("API parameters JSON must be a valid array.")
      return
    }

    const maxChars = Number(maxCharsDraft)
    if (!Number.isFinite(maxChars) || maxChars <= 0) {
      onFeedback("API max chars must be a positive number.")
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
  }

  async function handleDeleteApi() {
    await deleteCubiclesApi(api.name)
    await onRefresh()
    onSelectApi("")
    onFeedback(`Deleted API '${api.name}'.`)
  }

  return (
    <div className="space-y-2">
      <FieldGroup>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field>
            <FieldLabel htmlFor={`api-group-${api.name}`}>Group</FieldLabel>
            <FieldContent>
              <Input
                id={`api-group-${api.name}`}
                value={groupDraft}
                onChange={(event) => setGroupDraft(event.target.value)}
                placeholder="Group"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={`api-maxchars-${api.name}`}>Max chars</FieldLabel>
            <FieldContent>
              <Input
                id={`api-maxchars-${api.name}`}
                value={maxCharsDraft}
                onChange={(event) => setMaxCharsDraft(event.target.value)}
                placeholder="4000"
              />
            </FieldContent>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`api-url-${api.name}`}>URL</FieldLabel>
          <FieldContent>
            <Input
              id={`api-url-${api.name}`}
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              placeholder="URL"
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor={`api-description-${api.name}`}>Description</FieldLabel>
          <FieldContent>
            <Textarea
              id={`api-description-${api.name}`}
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              className="min-h-20"
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor={`api-parameters-${api.name}`}>Parameters JSON</FieldLabel>
          <FieldContent>
            <Textarea
              id={`api-parameters-${api.name}`}
              value={parametersDraft}
              onChange={(event) => setParametersDraft(event.target.value)}
              className="min-h-28 font-mono text-xs"
            />
          </FieldContent>
        </Field>

        <Field className="w-fit">
          <FieldLabel>Enabled</FieldLabel>
          <div className="flex h-9 items-center">
            <Switch
              checked={enabledDraft}
              onCheckedChange={setEnabledDraft}
            />
          </div>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void handleSaveApi()}>Save API</Button>
        <Button size="sm" variant="destructive" onClick={() => void handleDeleteApi()}>
          Delete
        </Button>
      </div>
    </div>
  )
}

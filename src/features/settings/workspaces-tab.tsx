import { useState } from "react"

import {
  createCubiclesWorkspace,
  deleteCubiclesWorkspace,
  setCubiclesDefaultWorkspace,
  updateCubiclesSettings,
  updateCubiclesWorkspace,
} from "@/lib/cubicles-api/client"
import type { CubiclesWorkspaceResponse } from "@/lib/cubicles-api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { EmptyPanel } from "./shared"

type WorkspacesTabProps = {
  workspaces: CubiclesWorkspaceResponse[] | undefined
  effectiveSelectedWorkspaceId: string
  selectedWorkspace: CubiclesWorkspaceResponse | null
  onSelectWorkspace: (id: string) => void
  onRefresh: () => Promise<void>
  showFeedback: (message: string) => void
}

export function WorkspacesTab({
  workspaces,
  effectiveSelectedWorkspaceId,
  selectedWorkspace,
  onSelectWorkspace,
  onRefresh,
  showFeedback,
}: WorkspacesTabProps) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Workspaces</h2>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {workspaces?.length ?? 0}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-6 gap-1 rounded-md px-2 text-xs"
          onClick={() => setShowCreate(true)}
        >
          <svg className="size-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Register
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="space-y-1">
          {workspaces?.map((workspace) => (
            <Toggle
              key={workspace.id}
              pressed={effectiveSelectedWorkspaceId === workspace.id}
              onClick={() => onSelectWorkspace(workspace.id)}
              variant="outline"
              className="flex h-auto w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10"
            >
              <span className="min-w-0 truncate">{workspace.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {workspace.is_default ? "default" : workspace.exists ? "ready" : "missing"}
              </span>
            </Toggle>
          ))}
        </div>

        {selectedWorkspace ? (
          <WorkspaceEditor
            key={selectedWorkspace.id}
            workspace={selectedWorkspace}
            onFeedback={showFeedback}
            onRefresh={onRefresh}
            onSelectWorkspace={onSelectWorkspace}
          />
        ) : (
          <EmptyPanel message="Select a workspace to edit it." />
        )}
      </div>

      <CreateWorkspaceDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onFeedback={showFeedback}
        onRefresh={onRefresh}
        onSelectWorkspace={onSelectWorkspace}
      />
    </div>
  )
}

type CreateWorkspaceDialogProps = {
  open: boolean
  onClose: () => void
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
  onSelectWorkspace: (id: string) => void
}

function CreateWorkspaceDialog({ open, onClose, onFeedback, onRefresh, onSelectWorkspace }: CreateWorkspaceDialogProps) {
  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [description, setDescription] = useState("")

  async function handleCreate() {
    const trimmedPath = path.trim()
    if (!trimmedPath) {
      onFeedback("Workspace path is required.")
      return
    }
    const created = await createCubiclesWorkspace({
      id: id.trim() || null,
      name: name.trim() || null,
      path: trimmedPath,
      description: description.trim(),
    })
    await onRefresh()
    onSelectWorkspace(created.id)
    onFeedback(`Created workspace '${created.name}'.`)
    setId(""); setName(""); setPath(""); setDescription("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Register workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="create-ws-id">Workspace ID</FieldLabel>
              <FieldContent><Input id="create-ws-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="optional-id" /></FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="create-ws-name">Display name</FieldLabel>
              <FieldContent><Input id="create-ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" /></FieldContent>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="create-ws-path">Path</FieldLabel>
            <FieldContent><Input id="create-ws-path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/absolute/path/to/workspace" /></FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="create-ws-description">Description</FieldLabel>
            <FieldContent><Textarea id="create-ws-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" /></FieldContent>
          </Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void handleCreate()}>Register</Button>
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type WorkspaceEditorProps = {
  workspace: CubiclesWorkspaceResponse
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
  onSelectWorkspace: (id: string) => void
}

function WorkspaceEditor({
  workspace,
  onFeedback,
  onRefresh,
  onSelectWorkspace,
}: WorkspaceEditorProps) {
  const [workspacePathDraft, setWorkspacePathDraft] = useState(workspace.path)
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState(workspace.name)
  const [workspaceDescriptionDraft, setWorkspaceDescriptionDraft] = useState(
    workspace.description
  )
  const [makeDefaultDraft, setMakeDefaultDraft] = useState(workspace.is_default)

  async function handleSaveWorkspace() {
    await updateCubiclesWorkspace(workspace.id, {
      path: workspacePathDraft.trim(),
      name: workspaceNameDraft.trim() || workspace.id,
      description: workspaceDescriptionDraft.trim(),
      make_default: makeDefaultDraft,
    })

    if (makeDefaultDraft && !workspace.is_default) {
      await updateCubiclesSettings({ default_workspace_id: workspace.id })
    }

    await onRefresh()
    onSelectWorkspace(workspace.id)
    onFeedback("Workspace saved.")
  }

  async function handleSetDefaultWorkspace() {
    await setCubiclesDefaultWorkspace(workspace.id)
    await updateCubiclesSettings({ default_workspace_id: workspace.id })
    await onRefresh()
    onSelectWorkspace(workspace.id)
    onFeedback(`Set '${workspace.name}' as the default workspace.`)
  }

  async function handleDeleteWorkspace() {
    await deleteCubiclesWorkspace(workspace.id)
    await onRefresh()
    onSelectWorkspace("")
    onFeedback(`Deleted workspace '${workspace.name}'.`)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{workspace.id}</span>
        {workspace.is_default ? <Badge className="h-4 rounded-full px-1.5 text-[10px]">Default</Badge> : null}
        <Badge variant={workspace.exists ? "secondary" : "outline"} className="h-4 rounded-full px-1.5 text-[10px]">
          {workspace.exists ? "Exists" : "Missing"}
        </Badge>
      </div>

      <FieldGroup>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field>
            <FieldLabel htmlFor={`workspace-name-${workspace.id}`}>Display name</FieldLabel>
            <FieldContent>
              <Input
                id={`workspace-name-${workspace.id}`}
                value={workspaceNameDraft}
                onChange={(event) => setWorkspaceNameDraft(event.target.value)}
                placeholder="Workspace name"
              />
            </FieldContent>
          </Field>
          <Field className="sm:w-auto">
            <FieldLabel>Default</FieldLabel>
            <div className="flex h-9 items-center">
              <Switch
                checked={makeDefaultDraft}
                onCheckedChange={setMakeDefaultDraft}
              />
            </div>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`workspace-path-${workspace.id}`}>Path</FieldLabel>
          <FieldContent>
            <Input
              id={`workspace-path-${workspace.id}`}
              value={workspacePathDraft}
              onChange={(event) => setWorkspacePathDraft(event.target.value)}
              placeholder="/absolute/path/to/workspace"
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor={`workspace-description-${workspace.id}`}>Description</FieldLabel>
          <FieldContent>
            <Textarea
              id={`workspace-description-${workspace.id}`}
              value={workspaceDescriptionDraft}
              onChange={(event) => setWorkspaceDescriptionDraft(event.target.value)}
              className="min-h-20"
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void handleSaveWorkspace()}>Save workspace</Button>
        {!workspace.is_default ? (
          <Button size="sm" variant="secondary" onClick={() => void handleSetDefaultWorkspace()}>
            Make default
          </Button>
        ) : null}
        <Button size="sm" variant="destructive" onClick={() => void handleDeleteWorkspace()}>
          Delete
        </Button>
      </div>
    </div>
  )
}

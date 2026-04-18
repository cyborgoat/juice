import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  createCubiclesWorkspace,
  createCubiclesApi,
  createCubiclesProfile,
  deleteCubiclesApi,
  deleteCubiclesProfile,
  deleteCubiclesWorkspace,
  fetchCubiclesApiGroups,
  fetchCubiclesApis,
  fetchCubiclesMemoryDocument,
  fetchCubiclesProfileDetail,
  fetchCubiclesProfiles,
  fetchCubiclesSettings,
  fetchCubiclesSkills,
  fetchCubiclesToolCatalog,
  fetchCubiclesWorkspaces,
  scanCubiclesSkills,
  setCubiclesDefaultWorkspace,
  setCubiclesExtensionEnabled,
  setCubiclesSkillEnabled,
  updateCubiclesApi,
  updateCubiclesMemoryDocument,
  updateCubiclesProfile,
  updateCubiclesSettings,
  updateCubiclesWorkspace,
} from "@/lib/cubicles-api/client"
import type {
  CubiclesApiParameter,
  CubiclesApiRecord,
  CubiclesProfileDetailResponse,
  CubiclesSkillResponse,
  CubiclesToolRecord,
  CubiclesWorkspaceResponse,
} from "@/lib/cubicles-api/types"
import { type CubiclesBackendState } from "@/lib/tauri/cubicles-backend"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"

type SettingsScreenProps = {
  backendState: CubiclesBackendState
}

type SettingsTab = "overview" | "profiles" | "workspaces" | "memory" | "apis" | "extensions" | "skills"

export function SettingsScreen({ backendState }: SettingsScreenProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview")
  const [selectedProfileName, setSelectedProfileName] = useState("")
  const [selectedApiName, setSelectedApiName] = useState("")
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileJson, setNewProfileJson] = useState(
    '{\n  "provider_id": "",\n  "model": ""\n}'
  )
  const [newApiName, setNewApiName] = useState("")
  const [newApiGroup, setNewApiGroup] = useState("")
  const [newApiUrl, setNewApiUrl] = useState("")
  const [newApiDescription, setNewApiDescription] = useState("")
  const [newApiMaxChars, setNewApiMaxChars] = useState("4000")
  const [newApiParametersJson, setNewApiParametersJson] = useState("[]")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("")
  const [newWorkspaceId, setNewWorkspaceId] = useState("")
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspacePath, setNewWorkspacePath] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const isReady = backendState.mode === "ready"

  const settingsQuery = useQuery({
    queryKey: ["cubicles", "settings"],
    queryFn: fetchCubiclesSettings,
    enabled: isReady,
  })

  const profilesQuery = useQuery({
    queryKey: ["cubicles", "profiles"],
    queryFn: fetchCubiclesProfiles,
    enabled: isReady,
  })

  const workspacesQuery = useQuery({
    queryKey: ["cubicles", "workspaces"],
    queryFn: fetchCubiclesWorkspaces,
    enabled: isReady,
  })

  const memoryQuery = useQuery({
    queryKey: ["cubicles", "memory-document", "memory"],
    queryFn: () => fetchCubiclesMemoryDocument("memory"),
    enabled: isReady,
  })

  const apisQuery = useQuery({
    queryKey: ["cubicles", "apis"],
    queryFn: fetchCubiclesApis,
    enabled: isReady,
  })

  const apiGroupsQuery = useQuery({
    queryKey: ["cubicles", "api-groups"],
    queryFn: fetchCubiclesApiGroups,
    enabled: isReady,
  })

  const effectiveSelectedProfileName = useMemo(() => {
    if (!profilesQuery.data?.length) {
      return ""
    }

    if (selectedProfileName) {
      const match = profilesQuery.data.find((profile) => profile.name === selectedProfileName)
      if (match) {
        return match.name
      }
    }

    return (
      settingsQuery.data?.default_profile ??
      profilesQuery.data.find((profile) => profile.status === "default")?.name ??
      profilesQuery.data[0]?.name ??
      ""
    )
  }, [profilesQuery.data, selectedProfileName, settingsQuery.data?.default_profile])

  const toolingProfileName = effectiveSelectedProfileName || settingsQuery.data?.default_profile || "default"

  const profileDetailQuery = useQuery({
    queryKey: ["cubicles", "profile-detail", effectiveSelectedProfileName],
    queryFn: () => fetchCubiclesProfileDetail(effectiveSelectedProfileName),
    enabled: isReady && Boolean(effectiveSelectedProfileName),
  })

  const providerHints = useMemo(
    () => settingsQuery.data?.providers ?? [],
    [settingsQuery.data?.providers]
  )

  const effectiveSelectedWorkspaceId = useMemo(() => {
    if (!workspacesQuery.data?.length) {
      return ""
    }

    if (selectedWorkspaceId) {
      const match = workspacesQuery.data.find((workspace) => workspace.id === selectedWorkspaceId)
      if (match) {
        return match.id
      }
    }

    return (
      settingsQuery.data?.default_workspace_id ??
      workspacesQuery.data.find((workspace) => workspace.is_default)?.id ??
      workspacesQuery.data[0]?.id ??
      ""
    )
  }, [selectedWorkspaceId, settingsQuery.data?.default_workspace_id, workspacesQuery.data])

  const selectedWorkspace = useMemo(
    () =>
      workspacesQuery.data?.find((workspace) => workspace.id === effectiveSelectedWorkspaceId) ?? null,
    [effectiveSelectedWorkspaceId, workspacesQuery.data]
  )

  const skillsQuery = useQuery({
    queryKey: ["cubicles", "skills", toolingProfileName],
    queryFn: () => fetchCubiclesSkills(toolingProfileName),
    enabled: isReady,
  })

  const toolsQuery = useQuery({
    queryKey: ["cubicles", "tools-catalog", toolingProfileName],
    queryFn: () => fetchCubiclesToolCatalog(toolingProfileName),
    enabled: isReady,
  })

  const effectiveSelectedApiName = useMemo(() => {
    if (!apisQuery.data?.length) {
      return ""
    }

    if (selectedApiName) {
      const match = apisQuery.data.find((api) => api.name === selectedApiName)
      if (match) {
        return match.name
      }
    }

    return apisQuery.data[0]?.name ?? ""
  }, [apisQuery.data, selectedApiName])

  const selectedApi = useMemo(
    () => apisQuery.data?.find((api) => api.name === effectiveSelectedApiName) ?? null,
    [apisQuery.data, effectiveSelectedApiName]
  )

  async function refreshSettingsData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cubicles", "settings"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "profiles"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "workspaces"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "profile-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "memory-document", "memory"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "apis"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "api-groups"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "skills"] }),
      queryClient.invalidateQueries({ queryKey: ["cubicles", "tools-catalog"] }),
    ])
  }

  function showFeedback(message: string) {
    toast(message)
  }

  async function handleCreateProfile() {
    const trimmedName = newProfileName.trim()
    if (!trimmedName) {
      showFeedback("New profile name is required.")
      return
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(newProfileJson) as Record<string, unknown>
    } catch {
      showFeedback("New profile JSON is invalid.")
      return
    }

    await createCubiclesProfile(trimmedName, {
      data: {
        ...parsed,
        name: trimmedName,
      },
    })

    await refreshSettingsData()
    setSelectedProfileName(trimmedName)
    setNewProfileName("")
    showFeedback(`Created profile '${trimmedName}'.`)
  }

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

    await refreshSettingsData()
    setSelectedApiName(trimmedName)
    setNewApiName("")
    setNewApiGroup("")
    setNewApiUrl("")
    setNewApiDescription("")
    setNewApiMaxChars("4000")
    setNewApiParametersJson("[]")
    showFeedback(`Created API '${trimmedName}'.`)
  }

  async function handleCreateWorkspace() {
    const trimmedPath = newWorkspacePath.trim()
    if (!trimmedPath) {
      showFeedback("Workspace path is required.")
      return
    }

    const createdWorkspace = await createCubiclesWorkspace({
      id: newWorkspaceId.trim() || null,
      name: newWorkspaceName.trim() || null,
      path: trimmedPath,
      description: newWorkspaceDescription.trim(),
    })

    await refreshSettingsData()
    setSelectedWorkspaceId(createdWorkspace.id)
    setNewWorkspaceId("")
    setNewWorkspaceName("")
    setNewWorkspacePath("")
    setNewWorkspaceDescription("")
    showFeedback(`Created workspace '${createdWorkspace.name}'.`)
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      description: "Runtime metadata",
    },
    {
      id: "profiles",
      label: "Profiles",
      description: `${profilesQuery.data?.length ?? 0} configured`,
    },
    {
      id: "workspaces",
      label: "Workspaces",
      description: `${workspacesQuery.data?.length ?? 0} available`,
    },
    {
      id: "memory",
      label: "Memory",
      description: "Edit MEMORY.md",
    },
    {
      id: "apis",
      label: "APIs",
      description: `${apisQuery.data?.length ?? 0} registered`,
    },
    {
      id: "extensions",
      label: "Extensions",
      description: `${toolsQuery.data?.extensions.length ?? 0} discovered`,
    },
    {
      id: "skills",
      label: "Skills",
      description: `${skillsQuery.data?.length ?? 0} available`,
    },
  ] satisfies Array<{
    id: SettingsTab
    label: string
    description: string
  }>

  if (!isReady) {
    return (
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4">
        <div className="rounded-2xl border border-border/70 bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          Settings are available after the Cubicles backend is connected.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SettingsTab)}
          className="gap-4"
        >
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-auto min-w-fit shrink-0 justify-center overflow-hidden rounded-xl border border-border/70 bg-background/50 px-4 text-left leading-none hover:bg-background/80 data-active:bg-primary/10"
              >
                <span className="block truncate text-sm font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <section className="min-w-0">
            <TabsContent value="overview">
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
              <div>
                <h2 className="text-sm font-semibold">Runtime overview</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Backend metadata, provider hints, and current default profile state from
                  Cubicles.
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoCard
                  label="Default profile"
                  value={settingsQuery.data?.default_profile ?? "Not set"}
                />
                <InfoCard
                  label="Default workspace"
                  value={settingsQuery.data?.default_workspace_id ?? "Not set"}
                />
                <InfoCard label="Cubicles home" value={settingsQuery.data?.cubicles_home ?? "—"} />
                <InfoCard
                  label="Sessions database"
                  value={settingsQuery.data?.sessions_db ?? "—"}
                />
              </div>

              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Provider specs
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {providerHints.map((provider) => (
                    <div
                      key={provider.id}
                      className="rounded-xl border border-border/70 bg-background/55 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{provider.label}</p>
                        <Badge variant="outline" className="rounded-full">
                          {provider.provider}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {provider.description}
                      </p>
                      {provider.model_examples.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Examples: {provider.model_examples.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="profiles">
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Profiles</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add, edit, delete, and set the default Cubicles profile.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {profilesQuery.data?.length ?? 0} profiles
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {profilesQuery.data?.map((profile) => (
                    <Toggle
                      key={profile.name}
                      pressed={effectiveSelectedProfileName === profile.name}
                      onClick={() => setSelectedProfileName(profile.name)}
                      variant="outline"
                      className="flex h-auto w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10"
                    >
                      <span className="truncate">{profile.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {profile.status}
                      </span>
                    </Toggle>
                  ))}
                </div>

                {profileDetailQuery.data ? (
                  <ProfileEditor
                    key={profileDetailQuery.data.name}
                    profile={profileDetailQuery.data}
                    onFeedback={showFeedback}
                    onRefresh={refreshSettingsData}
                    onSelectProfile={setSelectedProfileName}
                  />
                ) : (
                  <EmptyPanel message="Select a profile to edit it." />
                )}
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-background/55 p-3">
                <FieldSet>
                  <FieldLegendLike title="Create profile" />
                  <FieldGroup className="mt-3">
                    <Field>
                      <FieldLabel htmlFor="new-profile-name">Profile name</FieldLabel>
                      <FieldContent>
                        <Input
                          id="new-profile-name"
                          value={newProfileName}
                          onChange={(event) => setNewProfileName(event.target.value)}
                          placeholder="New profile name"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-profile-json">Profile JSON</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="new-profile-json"
                          value={newProfileJson}
                          onChange={(event) => setNewProfileJson(event.target.value)}
                          className="min-h-36 font-mono text-xs"
                        />
                        <FieldDescription>
                          Use the raw Cubicles profile shape so the UI stays compatible with
                          backend updates.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                    <div>
                      <Button onClick={() => void handleCreateProfile()}>Create profile</Button>
                    </div>
                  </FieldGroup>
                </FieldSet>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="workspaces">
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Workspaces</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Register project roots, choose the default workspace, and keep Cubicles session routing aligned with desktop context.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {workspacesQuery.data?.length ?? 0} workspaces
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {workspacesQuery.data?.map((workspace) => (
                    <Toggle
                      key={workspace.id}
                      pressed={effectiveSelectedWorkspaceId === workspace.id}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                      variant="outline"
                      className="flex h-auto w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10"
                    >
                      <span className="min-w-0 truncate">{workspace.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
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
                    onRefresh={refreshSettingsData}
                    onSelectWorkspace={setSelectedWorkspaceId}
                  />
                ) : (
                  <EmptyPanel message="Select a workspace to edit it." />
                )}
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-background/55 p-3">
                <FieldSet>
                  <FieldLegendLike title="Register workspace" />
                  <FieldGroup className="mt-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="new-workspace-id">Workspace ID</FieldLabel>
                        <FieldContent>
                          <Input
                            id="new-workspace-id"
                            value={newWorkspaceId}
                            onChange={(event) => setNewWorkspaceId(event.target.value)}
                            placeholder="optional-id"
                          />
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="new-workspace-name">Display name</FieldLabel>
                        <FieldContent>
                          <Input
                            id="new-workspace-name"
                            value={newWorkspaceName}
                            onChange={(event) => setNewWorkspaceName(event.target.value)}
                            placeholder="Workspace name"
                          />
                        </FieldContent>
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="new-workspace-path">Path</FieldLabel>
                      <FieldContent>
                        <Input
                          id="new-workspace-path"
                          value={newWorkspacePath}
                          onChange={(event) => setNewWorkspacePath(event.target.value)}
                          placeholder="/absolute/path/to/workspace"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-workspace-description">Description</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="new-workspace-description"
                          value={newWorkspaceDescription}
                          onChange={(event) => setNewWorkspaceDescription(event.target.value)}
                          className="min-h-24"
                        />
                      </FieldContent>
                    </Field>
                    <div>
                      <Button onClick={() => void handleCreateWorkspace()}>Register workspace</Button>
                    </div>
                  </FieldGroup>
                </FieldSet>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="memory">
              {memoryQuery.data ? (
              <MemoryEditor
                key={memoryQuery.data.path}
                initialContent={memoryQuery.data.content}
                path={memoryQuery.data.path}
                onFeedback={showFeedback}
                onSave={async (content) => {
                  await updateCubiclesMemoryDocument("memory", content)
                  await queryClient.invalidateQueries({
                    queryKey: ["cubicles", "memory-document", "memory"],
                  })
                }}
              />
              ) : (
              <LoadingPanel message="Loading memory document…" />
              )}
            </TabsContent>

            <TabsContent value="apis">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">APIs</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Register, edit, enable, disable, and remove Cubicles API tools.
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {apisQuery.data?.length ?? 0} APIs
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {apiGroupsQuery.data?.map((group) => (
                    <div
                      key={group.group}
                      className="rounded-xl border border-border/70 bg-background/55 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{group.group}</p>
                        <Badge variant="outline" className="rounded-full">
                          {group.enabled_count}/{group.api_count}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{group.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    {apisQuery.data?.map((api) => (
                      <Toggle
                        key={api.name}
                        pressed={effectiveSelectedApiName === api.name}
                        onClick={() => setSelectedApiName(api.name)}
                        variant="outline"
                        className="flex h-auto w-full min-w-0 flex-col items-start overflow-hidden rounded-xl px-3 py-2 text-left data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10"
                      >
                        <span className="block w-full truncate text-sm font-medium">{api.name}</span>
                        <span className="block w-full truncate text-xs text-muted-foreground">
                          {api.group} · {api.enabled ? "enabled" : "disabled"}
                        </span>
                      </Toggle>
                    ))}
                  </div>

                  {selectedApi ? (
                    <ApiEditor
                      key={selectedApi.name}
                      api={selectedApi}
                      onFeedback={showFeedback}
                      onRefresh={refreshSettingsData}
                      onSelectApi={setSelectedApiName}
                    />
                  ) : (
                    <EmptyPanel message="Select an API to edit it." />
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-border/70 bg-background/55 p-3">
                  <FieldSet>
                    <FieldLegendLike title="Register API" />
                    <FieldGroup className="mt-3">
                      <div className="grid gap-3 md:grid-cols-2">
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
                            className="min-h-24"
                            placeholder="Describe what this API tool does"
                          />
                        </FieldContent>
                      </Field>
                      <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
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
                              className="min-h-28 font-mono text-xs"
                              placeholder='[{"name":"q","type":"string","required":true,"location":"query"}]'
                            />
                          </FieldContent>
                        </Field>
                      </div>
                      <div>
                        <Button onClick={() => void handleCreateApi()}>Register API</Button>
                      </div>
                    </FieldGroup>
                  </FieldSet>
                </div>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="extensions">
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Extensions</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review and toggle custom extension tools discovered by Cubicles.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {toolsQuery.data?.extensions.length ?? 0} extensions
                </Badge>
              </div>

              <div className="mt-4 grid gap-3">
                {toolsQuery.data?.extensions.length ? (
                  toolsQuery.data.extensions.map((extension) => (
                    <ToolToggleCard
                      key={extension.name}
                      tool={extension}
                      onToggle={async () => {
                        await setCubiclesExtensionEnabled(extension.name, !extension.enabled)
                        await refreshSettingsData()
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
            </TabsContent>

            <TabsContent value="skills">
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Skills</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scan installed skills and toggle whether Cubicles loads them.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {skillsQuery.data?.length ?? 0} skills
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const scanned = await scanCubiclesSkills(toolingProfileName)
                      await refreshSettingsData()
                      showFeedback(`Scanned ${scanned.discovered.length} skills.`)
                    }}
                  >
                    Scan
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {skillsQuery.data?.length ? (
                  skillsQuery.data.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      onToggle={async () => {
                        await setCubiclesSkillEnabled(
                          skill.name,
                          !skill.enabled,
                          toolingProfileName
                        )
                        await refreshSettingsData()
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
            </TabsContent>
          </section>
        </Tabs>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/55 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  )
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/65 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function FieldLegendLike({ title }: { title: string }) {
  return <p className="text-sm font-medium">{title}</p>
}

type ProfileEditorProps = {
  profile: CubiclesProfileDetailResponse
  onFeedback: (message: string) => void
  onRefresh: () => Promise<void>
  onSelectProfile: (name: string) => void
}

function ProfileEditor({
  profile,
  onFeedback,
  onRefresh,
  onSelectProfile,
}: ProfileEditorProps) {
  const [profileNameDraft, setProfileNameDraft] = useState(profile.name)
  const [profileJsonDraft, setProfileJsonDraft] = useState(
    JSON.stringify(profile.data, null, 2)
  )
  const [makeDefaultDraft, setMakeDefaultDraft] = useState(profile.is_default)

  async function handleSaveProfile() {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(profileJsonDraft) as Record<string, unknown>
    } catch {
      onFeedback("Profile JSON is invalid.")
      return
    }

    const nextName = profileNameDraft.trim() || profile.name
    await updateCubiclesProfile(profile.name, {
      data: {
        ...parsed,
        name: nextName,
      },
      make_default: makeDefaultDraft,
    })

    if (makeDefaultDraft) {
      await updateCubiclesSettings({ default_profile: nextName })
    }

    await onRefresh()
    onSelectProfile(nextName)
    onFeedback("Profile saved.")
  }

  async function handleDeleteProfile() {
    await deleteCubiclesProfile(profile.name)
    await onRefresh()
    onSelectProfile("")
    onFeedback(`Deleted profile '${profile.name}'.`)
  }

  return (
    <div className="space-y-3">
      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Field>
            <FieldLabel htmlFor={`profile-name-${profile.name}`}>Profile name</FieldLabel>
            <FieldContent>
              <Input
                id={`profile-name-${profile.name}`}
                value={profileNameDraft}
                onChange={(event) => setProfileNameDraft(event.target.value)}
                placeholder="Profile name"
              />
            </FieldContent>
          </Field>
          <Field className="md:w-auto">
            <FieldLabel>Default profile</FieldLabel>
            <Toggle
              pressed={makeDefaultDraft}
              onPressedChange={setMakeDefaultDraft}
              variant="outline"
              className="rounded-xl px-3"
            >
              {makeDefaultDraft ? "Default" : "Set default"}
            </Toggle>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`profile-json-${profile.name}`}>Profile JSON</FieldLabel>
          <FieldContent>
            <Textarea
              id={`profile-json-${profile.name}`}
              value={profileJsonDraft}
              onChange={(event) => setProfileJsonDraft(event.target.value)}
              className="min-h-64 font-mono text-xs"
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSaveProfile()}>Save profile</Button>
        <Button variant="destructive" onClick={() => void handleDeleteProfile()}>
          Delete profile
        </Button>
      </div>
    </div>
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
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-background/55 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Workspace ID
            </p>
            <p className="mt-1 text-sm font-medium">{workspace.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {workspace.is_default ? (
              <Badge className="rounded-full">Default</Badge>
            ) : null}
            <Badge variant={workspace.exists ? "secondary" : "outline"} className="rounded-full">
              {workspace.exists ? "Path exists" : "Path missing"}
            </Badge>
          </div>
        </div>
      </div>

      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
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
          <Field className="md:w-auto">
            <FieldLabel>Default workspace</FieldLabel>
            <Toggle
              pressed={makeDefaultDraft}
              onPressedChange={setMakeDefaultDraft}
              variant="outline"
              className="rounded-xl px-3"
            >
              {makeDefaultDraft ? "Default" : "Set default"}
            </Toggle>
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
              className="min-h-24"
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSaveWorkspace()}>Save workspace</Button>
        {!workspace.is_default ? (
          <Button variant="secondary" onClick={() => void handleSetDefaultWorkspace()}>
            Make default
          </Button>
        ) : null}
        <Button variant="destructive" onClick={() => void handleDeleteWorkspace()}>
          Delete workspace
        </Button>
      </div>
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
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-background/55 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">API name</p>
        <p className="mt-1 text-sm font-medium">{api.name}</p>
      </div>

      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
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
                placeholder="Max chars"
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
              className="min-h-24"
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
              className="min-h-36 font-mono text-xs"
            />
          </FieldContent>
        </Field>

        <Field className="w-fit">
          <FieldLabel>Enabled</FieldLabel>
          <Toggle
            pressed={enabledDraft}
            onPressedChange={setEnabledDraft}
            variant="outline"
            className="rounded-xl px-3"
          >
            {enabledDraft ? "Enabled" : "Disabled"}
          </Toggle>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSaveApi()}>Save API</Button>
        <Button variant="destructive" onClick={() => void handleDeleteApi()}>
          Delete API
        </Button>
      </div>
    </div>
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
    <div className="rounded-2xl border border-border/70 bg-card/65 p-4">
      <h2 className="text-sm font-semibold">Durable memory</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit the canonical long-term memory document used by Cubicles.
      </p>
      <div className="mt-3 rounded-xl border border-border/70 bg-background/55 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          File
        </p>
        <p className="mt-1 break-all text-sm">{path}</p>
      </div>
      <Textarea
        value={memoryDraft}
        onChange={(event) => setMemoryDraft(event.target.value)}
        className="mt-3 min-h-[28rem] font-mono text-xs"
      />
      <div className="mt-3">
        <Button onClick={() => void handleSaveMemory()}>Save MEMORY.md</Button>
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
    <div className="rounded-xl border border-border/70 bg-background/55 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{skill.name}</p>
            <Badge variant={skill.enabled ? "secondary" : "outline"} className="rounded-full">
              {skill.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{skill.description || "No description."}</p>
        </div>
        <Toggle
          pressed={skill.enabled}
          onPressedChange={() => void onToggle()}
          variant="outline"
          className="rounded-xl px-3"
        >
          {skill.enabled ? "Disable" : "Enable"}
        </Toggle>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <InfoCard label="Skill file" value={skill.path} />
        <InfoCard label="Helpers" value={String(skill.helperPaths.length)} />
      </div>
    </div>
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
    <div className="rounded-xl border border-border/70 bg-background/55 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{tool.name}</p>
            <Badge variant={tool.enabled ? "secondary" : "outline"} className="rounded-full">
              {tool.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {tool.description || "No description."}
          </p>
        </div>
        <Toggle
          pressed={tool.enabled}
          onPressedChange={() => void onToggle()}
          variant="outline"
          className="rounded-xl px-3"
        >
          {tool.enabled ? "Disable" : "Enable"}
        </Toggle>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <InfoCard label="Source" value={tool.source} />
        <InfoCard label="Group" value={tool.group} />
      </div>
    </div>
  )
}

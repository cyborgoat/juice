import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  fetchCubiclesApiGroups,
  fetchCubiclesApis,
  fetchCubiclesMemoryDocument,
  fetchCubiclesProfileDetail,
  fetchCubiclesProfiles,
  fetchCubiclesSettings,
  fetchCubiclesSkills,
  fetchCubiclesToolCatalog,
  fetchCubiclesWorkspaces,
  updateCubiclesMemoryDocument,
} from "@/lib/cubicles-api/client"
import type { CubiclesBackendState } from "@/lib/tauri/cubicles-backend"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApisTab } from "./apis-tab"
import { OverviewTab } from "./overview-tab"
import { ProfilesTab } from "./profiles-tab"
import { ExtensionsTab, HarnessTab, MemoryTab, SkillsTab } from "./tools-tab"
import { WorkspacesTab } from "./workspaces-tab"

export type SettingsTab = "overview" | "profiles" | "workspaces" | "memory" | "apis" | "extensions" | "skills" | "harness"

type SettingsScreenProps = {
  backendState: CubiclesBackendState
  activeTab?: SettingsTab
  onActiveTabChange?: (tab: SettingsTab) => void
}

export function SettingsScreen({ backendState, ...props }: SettingsScreenProps) {
  const queryClient = useQueryClient()
  const [internalTab, setInternalTab] = useState<SettingsTab>(props.activeTab ?? "overview")
  const activeTab = props.activeTab ?? internalTab
  function handleTabChange(value: string) {
    const tab = value as SettingsTab
    setInternalTab(tab)
    props.onActiveTabChange?.(tab)
  }
  const [selectedProfileName, setSelectedProfileName] = useState("")
  const [selectedApiName, setSelectedApiName] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("")
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
    {
      id: "harness",
      label: "Harness",
      description: "Agent hyperparameters",
    },
  ] satisfies Array<{
    id: SettingsTab
    label: string
    description: string
  }>

  if (!isReady) {
    return (
      <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center px-4">
        <div className="rounded-lg border border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          Settings are available after the Cubicles backend is connected.
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* Sticky tab nav */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-3 py-1.5 backdrop-blur-sm md:px-4">
          <div className="mx-auto max-w-4xl">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
              {tabs.map((tab, i) => (
                <>
                  {i === 3 && (
                    <span key="sep" className="mx-1 h-4 w-px self-center bg-border/60" aria-hidden />
                  )}
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="h-7 min-w-fit shrink-0 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-active:bg-primary/10 data-active:text-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                </>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 md:px-4">
          <div className="mx-auto max-w-4xl">
            <TabsContent value="overview">
              <OverviewTab
                settingsData={settingsQuery.data}
                providerHints={providerHints}
                backendState={backendState}
              />
            </TabsContent>

            <TabsContent value="profiles">
              <ProfilesTab
                profiles={profilesQuery.data}
                effectiveSelectedProfileName={effectiveSelectedProfileName}
                profileDetail={profileDetailQuery.data}
                onSelectProfile={setSelectedProfileName}
                onRefresh={refreshSettingsData}
                showFeedback={showFeedback}
              />
            </TabsContent>

            <TabsContent value="workspaces">
              <WorkspacesTab
                workspaces={workspacesQuery.data}
                effectiveSelectedWorkspaceId={effectiveSelectedWorkspaceId}
                selectedWorkspace={selectedWorkspace}
                onSelectWorkspace={setSelectedWorkspaceId}
                onRefresh={refreshSettingsData}
                showFeedback={showFeedback}
              />
            </TabsContent>

            <TabsContent value="memory">
              <MemoryTab
                memoryData={memoryQuery.data}
                onSaveMemory={async (content) => {
                  await updateCubiclesMemoryDocument("memory", content)
                  await queryClient.invalidateQueries({
                    queryKey: ["cubicles", "memory-document", "memory"],
                  })
                }}
                showFeedback={showFeedback}
              />
            </TabsContent>

            <TabsContent value="apis">
              <ApisTab
                apis={apisQuery.data}
                apiGroups={apiGroupsQuery.data}
                effectiveSelectedApiName={effectiveSelectedApiName}
                selectedApi={selectedApi}
                toolingProfileName={toolingProfileName}
                onSelectApi={setSelectedApiName}
                onRefresh={refreshSettingsData}
                showFeedback={showFeedback}
              />
            </TabsContent>

            <TabsContent value="extensions">
              <ExtensionsTab
                extensions={toolsQuery.data?.extensions}
                onRefresh={refreshSettingsData}
                showFeedback={showFeedback}
              />
            </TabsContent>

            <TabsContent value="skills">
              <SkillsTab
                skills={skillsQuery.data}
                toolingProfileName={toolingProfileName}
                onRefresh={refreshSettingsData}
                showFeedback={showFeedback}
              />
            </TabsContent>

            <TabsContent value="harness">
              <HarnessTab />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

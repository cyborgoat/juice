import { useState } from "react"
import { Plus } from "lucide-react"

import {
  createCubiclesProfile,
  deleteCubiclesProfile,
  updateCubiclesProfile,
  updateCubiclesSettings,
} from "@/lib/cubicles-api/client"
import type { CubiclesProfileDetailResponse } from "@/lib/cubicles-api/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { EmptyPanel } from "./shared"

type ProfileSummary = {
  name: string
  status: string
}

type ProfilesTabProps = {
  profiles: ProfileSummary[] | undefined
  effectiveSelectedProfileName: string
  profileDetail: CubiclesProfileDetailResponse | undefined
  onSelectProfile: (name: string) => void
  onRefresh: () => Promise<void>
  showFeedback: (message: string) => void
}

export function ProfilesTab({
  profiles,
  effectiveSelectedProfileName,
  profileDetail,
  onSelectProfile,
  onRefresh,
  showFeedback,
}: ProfilesTabProps) {
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileJson, setNewProfileJson] = useState(
    '{\n  "provider_id": "",\n  "model": ""\n}'
  )

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

    await onRefresh()
    onSelectProfile(trimmedName)
    setNewProfileName("")
    showFeedback(`Created profile '${trimmedName}'.`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Profiles</h2>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {profiles?.length ?? 0}
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="space-y-1">
          {profiles?.map((profile) => (
            <Toggle
              key={profile.name}
              pressed={effectiveSelectedProfileName === profile.name}
              onClick={() => onSelectProfile(profile.name)}
              variant="outline"
              className="flex h-auto w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10"
            >
              <span className="truncate">{profile.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{profile.status}</span>
            </Toggle>
          ))}
        </div>

        {profileDetail ? (
          <ProfileEditor
            key={profileDetail.name}
            profile={profileDetail}
            onFeedback={showFeedback}
            onRefresh={onRefresh}
            onSelectProfile={onSelectProfile}
          />
        ) : (
          <EmptyPanel message="Select a profile to edit it." />
        )}
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg]:rotate-90">
          <Plus className="size-3" />
          Create profile
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border/50 bg-background/40 p-3">
            <FieldSet>
              <FieldGroup>
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
                      className="min-h-32 font-mono text-xs"
                    />
                    <FieldDescription>
                      Use the raw Cubicles profile shape so the UI stays compatible with backend updates.
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <div>
                  <Button size="sm" onClick={() => void handleCreateProfile()}>Create profile</Button>
                </div>
              </FieldGroup>
            </FieldSet>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
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
    <div className="space-y-2">
      <FieldGroup>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
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
          <FieldLabel htmlFor={`profile-json-${profile.name}`}>Profile JSON</FieldLabel>
          <FieldContent>
            <Textarea
              id={`profile-json-${profile.name}`}
              value={profileJsonDraft}
              onChange={(event) => setProfileJsonDraft(event.target.value)}
              className="min-h-52 font-mono text-xs"
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void handleSaveProfile()}>Save profile</Button>
        <Button size="sm" variant="destructive" onClick={() => void handleDeleteProfile()}>
          Delete
        </Button>
      </div>
    </div>
  )
}

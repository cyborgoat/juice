import type {
  CubiclesApiCreateRequest,
  CubiclesApiGroupSummary,
  CubiclesApiRecord,
  CubiclesApiUpdateRequest,
  CubiclesChatEvent,
  CubiclesChatStreamRequest,
  CubiclesHealthResponse,
  CubiclesMemoryDocument,
  CubiclesPendingApproval,
  CubiclesProfileDetailResponse,
  CubiclesProfileUpsertRequest,
  CubiclesProfileSummary,
  CubiclesSlashExecutionRequest,
  CubiclesSlashExecutionResponse,
  CubiclesSlashListResponse,
  CubiclesSessionHistoryMessage,
  CubiclesSessionResponse,
  CubiclesSkillResponse,
  CubiclesSkillScanResponse,
  CubiclesSettingsResponse,
  CubiclesToolCatalogResponse,
  ToolReference,
} from "@/lib/cubicles-api/types"
import { getCubiclesApiBase } from "@/lib/tauri/cubicles-backend"

async function fetchCubiclesJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${getCubiclesApiBase()}${path}`, init)

  if (!response.ok) {
    throw new Error(`Cubicles request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

async function fetchCubiclesVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${getCubiclesApiBase()}${path}`, init)

  if (!response.ok) {
    throw new Error(`Cubicles request failed: ${response.status} ${response.statusText}`)
  }
}

function withQuery(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value)
    }
  }

  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export function fetchCubiclesHealth() {
  return fetchCubiclesJson<CubiclesHealthResponse>("/health")
}

export function fetchCubiclesSettings() {
  return fetchCubiclesJson<CubiclesSettingsResponse>("/settings")
}

export function fetchCubiclesSessions() {
  return fetchCubiclesJson<CubiclesSessionResponse[]>("/sessions")
}

export function fetchCubiclesProfiles() {
  return fetchCubiclesJson<CubiclesProfileSummary[]>("/profiles")
}

export function fetchCubiclesProfileDetail(name: string) {
  return fetchCubiclesJson<CubiclesProfileDetailResponse>(`/profiles/${encodeURIComponent(name)}`)
}

export function createCubiclesProfile(
  name: string,
  body: CubiclesProfileUpsertRequest
) {
  return fetchCubiclesJson<CubiclesProfileDetailResponse>(
    `/profiles/${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )
}

export function updateCubiclesProfile(
  name: string,
  body: CubiclesProfileUpsertRequest
) {
  return fetchCubiclesJson<CubiclesProfileDetailResponse>(
    `/profiles/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )
}

export function deleteCubiclesProfile(name: string) {
  return fetchCubiclesJson<{
    deleted: string[]
    new_default: string | null
    cleared_default: boolean
  }>(`/profiles/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}

export function updateCubiclesSettings(body: {
  default_profile?: string
}) {
  return fetchCubiclesJson<CubiclesSettingsResponse>("/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export function fetchCubiclesMemoryDocument(identifier: string) {
  return fetchCubiclesJson<CubiclesMemoryDocument>(
    `/memory/documents/${encodeURIComponent(identifier)}`
  )
}

export function updateCubiclesMemoryDocument(identifier: string, content: string) {
  return fetchCubiclesJson<CubiclesMemoryDocument>(
    `/memory/documents/${encodeURIComponent(identifier)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    }
  )
}

export function fetchCubiclesApis() {
  return fetchCubiclesJson<CubiclesApiRecord[]>("/apis")
}

export function fetchCubiclesSlashCommands() {
  return fetchCubiclesJson<CubiclesSlashListResponse>("/slash")
}

export function executeCubiclesSlashCommand(body: CubiclesSlashExecutionRequest) {
  return fetchCubiclesJson<CubiclesSlashExecutionResponse>("/slash", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export function deleteCubiclesSession(
  sessionId: string,
  body?: {
    active_session_id?: string | null
    profile_name?: string | null
    workspace_path?: string | null
  }
) {
  return executeCubiclesSlashCommand({
    command: `/sessions delete ${sessionId}`,
    session_id: body?.active_session_id ?? undefined,
    profile_name: body?.profile_name ?? undefined,
    workspace_path: body?.workspace_path ?? undefined,
  })
}

export function fetchCubiclesApiGroups() {
  return fetchCubiclesJson<CubiclesApiGroupSummary[]>("/apis/groups")
}

export function createCubiclesApi(body: CubiclesApiCreateRequest) {
  return fetchCubiclesJson<CubiclesApiRecord>("/apis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export function updateCubiclesApi(name: string, body: CubiclesApiUpdateRequest) {
  return fetchCubiclesJson<CubiclesApiRecord>(`/apis/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export function setCubiclesApiEnabled(name: string, enabled: boolean) {
  return fetchCubiclesJson<{ name: string; enabled: boolean }>(
    `/apis/${encodeURIComponent(name)}/${enabled ? "enable" : "disable"}`,
    {
      method: "POST",
    }
  )
}

export function deleteCubiclesApi(name: string) {
  return fetchCubiclesVoid(`/apis/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}

export function fetchCubiclesSkills(profileName?: string) {
  return fetchCubiclesJson<CubiclesSkillResponse[]>(
    withQuery("/skills", { profile_name: profileName })
  )
}

export function scanCubiclesSkills(profileName?: string) {
  return fetchCubiclesJson<CubiclesSkillScanResponse>(
    withQuery("/skills/scan", { profile_name: profileName }),
    {
      method: "POST",
    }
  )
}

export function setCubiclesSkillEnabled(
  name: string,
  enabled: boolean,
  profileName?: string
) {
  return fetchCubiclesJson<{ name: string; enabled: boolean }>(
    `/skills/${encodeURIComponent(name)}/${enabled ? "enable" : "disable"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_name: profileName,
      }),
    }
  )
}

export function fetchCubiclesToolCatalog(profileName?: string) {
  return fetchCubiclesJson<CubiclesToolCatalogResponse>(
    withQuery("/tools", { profile_name: profileName })
  )
}

export function setCubiclesExtensionEnabled(name: string, enabled: boolean) {
  return fetchCubiclesJson<{ name: string; enabled: boolean }>(
    `/tools/extensions/${encodeURIComponent(name)}/${enabled ? "enable" : "disable"}`,
    {
      method: "POST",
    }
  )
}

export function fetchCubiclesToolReferences() {
  return fetchCubiclesJson<ToolReference[]>("/tools/references")
}

export function fetchCubiclesSessionHistory(sessionId: string) {
  return fetchCubiclesJson<CubiclesSessionHistoryMessage[]>(
    `/sessions/${sessionId}/history`
  )
}

export async function fetchCubiclesPendingApproval(sessionId: string) {
  const response = await fetch(`${getCubiclesApiBase()}/chat/pending/${encodeURIComponent(sessionId)}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Cubicles request failed: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as { pending: CubiclesPendingApproval }
  return payload.pending
}

export function stopCubiclesChat(sessionId: string) {
  return fetchCubiclesJson<{ status: string }>("/chat/stop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  })
}

export function createCubiclesSession(name?: string, workspacePath?: string | null) {
  return fetchCubiclesJson<CubiclesSessionResponse>("/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name ?? null,
      workspace_path: workspacePath?.trim() ? workspacePath : null,
    }),
  })
}

export function activateCubiclesSession(sessionId: string) {
  return fetchCubiclesJson<CubiclesSessionResponse>(`/sessions/${sessionId}/activate`, {
    method: "POST",
  })
}

export function updateCubiclesSession(
  sessionId: string,
  body: { name?: string | null; workspace_path?: string | null }
) {
  return fetchCubiclesJson<CubiclesSessionResponse>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

export async function* streamCubiclesChat(
  body: CubiclesChatStreamRequest,
  signal?: AbortSignal
): AsyncGenerator<CubiclesChatEvent> {
  const response = await fetch(`${getCubiclesApiBase()}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Cubicles chat stream failed: ${response.status} ${response.statusText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split("\n\n")
    buffer = chunks.pop() ?? ""

    for (const chunk of chunks) {
      const event = parseSseChunk(chunk)
      if (event) {
        yield event
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseChunk(buffer)
    if (event) {
      yield event
    }
  }
}

function parseSseChunk(chunk: string): CubiclesChatEvent | null {
  const lines = chunk.split("\n")
  let eventName = ""
  let data = ""

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trim()
    }
  }

  if (!eventName || !data) {
    return null
  }

  const parsed = JSON.parse(data) as Omit<CubiclesChatEvent, "type">
  return { type: eventName, ...parsed } as CubiclesChatEvent
}

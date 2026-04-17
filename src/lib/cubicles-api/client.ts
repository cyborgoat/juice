import type {
  CubiclesChatEvent,
  CubiclesChatStreamRequest,
  CubiclesHealthResponse,
  CubiclesProfileSummary,
  CubiclesSessionHistoryMessage,
  CubiclesSessionResponse,
  CubiclesSettingsResponse,
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

export function fetchCubiclesSessionHistory(sessionId: string) {
  return fetchCubiclesJson<CubiclesSessionHistoryMessage[]>(
    `/sessions/${sessionId}/history`
  )
}

export function createCubiclesSession(name?: string) {
  return fetchCubiclesJson<CubiclesSessionResponse>("/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name ?? null,
    }),
  })
}

export function activateCubiclesSession(sessionId: string) {
  return fetchCubiclesJson<CubiclesSessionResponse>(`/sessions/${sessionId}/activate`, {
    method: "POST",
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

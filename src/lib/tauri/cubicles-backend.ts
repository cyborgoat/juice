import { isTauri } from "@tauri-apps/api/core"
import { Child, Command } from "@tauri-apps/plugin-shell"

export type CubiclesBackendState =
  | {
      mode: "browser-preview"
      apiBase: string
      detail: string
    }
  | {
      mode: "starting" | "ready"
      apiBase: string
      detail: string
      pid: number | null
    }
  | {
      mode: "error"
      apiBase: string
      detail: string
      logs: string[]
    }

const CUBICLES_HOST = "127.0.0.1"
const CUBICLES_PORT = 7799
const CUBICLES_ROOT = "/Users/goatcheese/Documents/repositories/cubicles-ts"
const JUICE_ROOT = "/Users/goatcheese/Documents/repositories/juice"
const API_BASE = `http://${CUBICLES_HOST}:${CUBICLES_PORT}/api`
const HEALTH_URL = `http://${CUBICLES_HOST}:${CUBICLES_PORT}/health`

let backendChild: Child | null = null
let backendStartPromise: Promise<CubiclesBackendState> | null = null
const backendLogs: string[] = []

export function getCubiclesApiBase() {
  return API_BASE
}

async function waitForHealth(timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(HEALTH_URL)
      if (response.ok) {
        return true
      }
    } catch {
      // The backend may still be starting.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500))
  }

  return false
}

export async function ensureCubiclesBackend(): Promise<CubiclesBackendState> {
  if (!isTauri()) {
    return {
      mode: "browser-preview",
      apiBase: API_BASE,
      detail: "Running in browser preview mode. Backend supervision is only enabled inside Tauri.",
    }
  }

  if (await waitForHealth(500)) {
    return {
      mode: "ready",
      apiBase: API_BASE,
      detail: "Cubicles server is already reachable.",
      pid: backendChild?.pid ?? null,
    }
  }

  if (!backendStartPromise) {
    backendStartPromise = startCubiclesBackend()
  }

  return backendStartPromise
}

async function startCubiclesBackend(): Promise<CubiclesBackendState> {
  const commandEnv = {
    JUICE_CUBICLES_ROOT: CUBICLES_ROOT,
    HOST: CUBICLES_HOST,
    PORT: `${CUBICLES_PORT}`,
  }

  try {
    backendLogs.length = 0

    const buildResult = await Command.create(
      "build-cubicles-server",
      [],
      {
        cwd: JUICE_ROOT,
        env: commandEnv,
      }
    ).execute()

    if (buildResult.code !== 0) {
      throw new Error(buildResult.stderr || "Cubicles build failed.")
    }

    const command = Command.create(
      "run-cubicles-server",
      [],
      {
        cwd: JUICE_ROOT,
        env: commandEnv,
      }
    )

    command.stdout.on("data", (line) => {
      backendLogs.push(line)
    })
    command.stderr.on("data", (line) => {
      backendLogs.push(line)
    })
    command.on("close", ({ code, signal }) => {
      backendLogs.push(`cubicles-server closed (code=${code}, signal=${signal})`)
      backendChild = null
      backendStartPromise = null
    })
    command.on("error", (error) => {
      backendLogs.push(`cubicles-server error: ${error}`)
    })

    backendChild = await command.spawn()

    const isHealthy = await waitForHealth()
    if (!isHealthy) {
      throw new Error("Cubicles server did not pass health checks before timeout.")
    }

    return {
      mode: "ready",
      apiBase: API_BASE,
      detail: "Cubicles server is running locally and ready for API calls.",
      pid: backendChild.pid,
    }
  } catch (error) {
    backendStartPromise = null

    return {
      mode: "error",
      apiBase: API_BASE,
      detail: error instanceof Error ? error.message : String(error),
      logs: [...backendLogs],
    }
  }
}

export async function stopCubiclesBackend() {
  if (!backendChild) {
    return
  }

  await backendChild.kill()
  backendChild = null
  backendStartPromise = null
}

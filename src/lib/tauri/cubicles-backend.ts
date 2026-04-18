import { isTauri } from "@tauri-apps/api/core"
import { join, resourceDir } from "@tauri-apps/api/path"
import { Child, Command } from "@tauri-apps/plugin-shell"

import { createLogger } from "@/lib/logger"

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
const logger = createLogger("cubicles-backend")

let backendChild: Child | null = null
let backendStartPromise: Promise<CubiclesBackendState> | null = null
const backendLogs: string[] = []

export function getCubiclesApiBase() {
  return API_BASE
}

export function getCubiclesBackendLogs(): string[] {
  return [...backendLogs]
}

export async function testCubiclesHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const response = await fetch(HEALTH_URL)
    const latencyMs = Date.now() - start
    if (response.ok) {
      return { ok: true, latencyMs }
    }
    return { ok: false, latencyMs, error: `HTTP ${response.status}` }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) }
  }
}

async function waitForHealth(timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(HEALTH_URL)
      if (response.ok) {
        logger.debug("Health check passed")
        return true
      }
    } catch {
      // The backend may still be starting.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 500))
  }

  logger.warn("Health checks timed out", { timeoutMs })
  return false
}

export async function ensureCubiclesBackend(): Promise<CubiclesBackendState> {
  if (!isTauri()) {
    logger.info("Skipping backend supervision in browser preview mode")
    return {
      mode: "browser-preview",
      apiBase: API_BASE,
      detail: "Running in browser preview mode. Backend supervision is only enabled inside Tauri.",
    }
  }

  if (await waitForHealth(500)) {
    logger.info("Reusing reachable Cubicles backend", {
      apiBase: API_BASE,
      pid: backendChild?.pid ?? null,
    })
    return {
      mode: "ready",
      apiBase: API_BASE,
      detail: "Cubicles server is already reachable.",
      pid: backendChild?.pid ?? null,
    }
  }

  if (!backendStartPromise) {
    logger.info("Starting Cubicles backend")
    backendStartPromise = startCubiclesBackend()
  } else {
    logger.debug("Awaiting existing Cubicles backend startup")
  }

  return backendStartPromise
}

async function startCubiclesBackend(): Promise<CubiclesBackendState> {
  const bundledResourceRoot = import.meta.env.DEV ? null : await resourceDir()
  const bundledCubiclesRoot = bundledResourceRoot
    ? await join(bundledResourceRoot, "resources", "cubicles-runtime")
    : null
  const scriptRoot = import.meta.env.DEV
    ? `${JUICE_ROOT}/scripts`
    : bundledResourceRoot
      ? await join(bundledResourceRoot, "resources", "juice-scripts")
      : `${JUICE_ROOT}/scripts`
  const commandEnv = {
    JUICE_CUBICLES_ROOT: CUBICLES_ROOT,
    JUICE_BUNDLED_CUBICLES_ROOT: bundledCubiclesRoot ?? "",
    JUICE_SCRIPT_ROOT: scriptRoot,
    HOST: CUBICLES_HOST,
    PORT: `${CUBICLES_PORT}`,
  }

  try {
    backendLogs.length = 0
    logger.info("Building Cubicles runtime", {
      scriptRoot,
      bundled: !import.meta.env.DEV,
    })

    const buildResult = await Command.create(
      "build-cubicles-server",
      [],
      {
        cwd: scriptRoot,
        env: commandEnv,
      }
    ).execute()

    if (buildResult.code !== 0) {
      logger.error("Cubicles runtime build failed", {
        code: buildResult.code,
        stderr: buildResult.stderr,
      })
      throw new Error(buildResult.stderr || "Cubicles build failed.")
    }

    logger.info("Cubicles runtime build completed")

    const command = Command.create(
      "run-cubicles-server",
      [],
      {
        cwd: scriptRoot,
        env: commandEnv,
      }
    )

    command.stdout.on("data", (line) => {
      backendLogs.push(line)
      logger.debug("Cubicles stdout", line)
    })
    command.stderr.on("data", (line) => {
      backendLogs.push(line)
      logger.warn("Cubicles stderr", line)
    })
    command.on("close", ({ code, signal }) => {
      backendLogs.push(`cubicles-server closed (code=${code}, signal=${signal})`)
      logger.warn("Cubicles backend closed", { code, signal })
      backendChild = null
      backendStartPromise = null
    })
    command.on("error", (error) => {
      backendLogs.push(`cubicles-server error: ${error}`)
      logger.error("Cubicles backend process error", error)
    })

    backendChild = await command.spawn()
    logger.info("Cubicles backend spawned", { pid: backendChild.pid })

    const isHealthy = await waitForHealth()
    if (!isHealthy) {
      throw new Error("Cubicles server did not pass health checks before timeout.")
    }

    logger.info("Cubicles backend is ready", {
      apiBase: API_BASE,
      pid: backendChild.pid,
    })

    return {
      mode: "ready",
      apiBase: API_BASE,
      detail: "Cubicles server is running locally and ready for API calls.",
      pid: backendChild.pid,
    }
  } catch (error) {
    backendStartPromise = null
    logger.error("Failed to start Cubicles backend", error)

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

  logger.info("Stopping Cubicles backend", { pid: backendChild.pid })
  await backendChild.kill()
  backendChild = null
  backendStartPromise = null
}

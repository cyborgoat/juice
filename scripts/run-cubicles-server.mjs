import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const developmentCubiclesRoot = process.env.JUICE_CUBICLES_ROOT
const bundledCubiclesRoot = process.env.JUICE_BUNDLED_CUBICLES_ROOT
const host = process.env.HOST ?? "127.0.0.1"
const port = Number(process.env.PORT ?? "7788")

function resolveRuntimeServerEntry() {
  if (bundledCubiclesRoot) {
    const bundledEntry = resolve(bundledCubiclesRoot, "node_modules/@cubicles/server/dist/index.js")
    if (existsSync(bundledEntry)) {
      return bundledEntry
    }
  }

  if (!developmentCubiclesRoot) {
    throw new Error("JUICE_CUBICLES_ROOT is required when no bundled Cubicles runtime is available.")
  }

  const developmentEntry = resolve(developmentCubiclesRoot, "packages/server/dist/index.js")
  if (existsSync(developmentEntry)) {
    return developmentEntry
  }

  throw new Error("Cubicles server build not found in bundled or development runtime.")
}

const serverEntry = resolveRuntimeServerEntry()

const { startServer } = await import(pathToFileURL(serverEntry).href)
const server = startServer({
  host,
  port,
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0)
    })
  })
}

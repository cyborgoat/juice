import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

// Load .env from project root (Node 22+ built-in); skip silently if missing.
try { process.loadEnvFile(resolve(import.meta.dirname, "..", ".env")) } catch { /* no .env — rely on shell env */ }

const developmentCubiclesRoot = process.env.JUICE_CUBICLES_ROOT
const bundledCubiclesRoot = process.env.JUICE_BUNDLED_CUBICLES_ROOT

function hasDevelopmentServerBuild(root) {
  return existsSync(resolve(root, "packages/server/dist/index.js"))
}

function hasBundledServerBuild(root) {
  return existsSync(resolve(root, "node_modules/@cubicles/server/dist/index.js"))
}

if (bundledCubiclesRoot && hasBundledServerBuild(bundledCubiclesRoot)) {
  process.stdout.write(`Using bundled Cubicles runtime from ${bundledCubiclesRoot}\n`)
  process.exit(0)
}

if (!developmentCubiclesRoot) {
  throw new Error("JUICE_CUBICLES_ROOT is required when no bundled Cubicles runtime is available.")
}

// Always rebuild in dev mode to pick up source changes.
process.stdout.write(`Building Cubicles development runtime from ${developmentCubiclesRoot}\n`)
execFileSync("npm", ["run", "build"], {
  cwd: developmentCubiclesRoot,
  stdio: "inherit",
  env: process.env,
})

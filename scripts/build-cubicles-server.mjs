import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

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

if (hasDevelopmentServerBuild(developmentCubiclesRoot)) {
  process.stdout.write(`Using existing Cubicles development build from ${developmentCubiclesRoot}\n`)
  process.exit(0)
}

execFileSync("npm", ["run", "build"], {
  cwd: developmentCubiclesRoot,
  stdio: "inherit",
  env: process.env,
})

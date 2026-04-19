import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, cpSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const juiceRoot = resolve(scriptDir, "..")

// Load .env from project root (Node 22+ built-in); skip silently if missing.
try { process.loadEnvFile(resolve(juiceRoot, ".env")) } catch { /* no .env — rely on shell env */ }

const resourcesRoot = resolve(juiceRoot, "src-tauri/resources")
const packagedRuntimeRoot = resolve(resourcesRoot, "cubicles-runtime")
const packagedScriptsRoot = resolve(resourcesRoot, "juice-scripts")
const vendorRoot = resolve(packagedRuntimeRoot, "vendor")
const cubiclesRoot = process.env.JUICE_CUBICLES_ROOT

if (!cubiclesRoot) {
  throw new Error("JUICE_CUBICLES_ROOT is required. Set it in .env or as a shell environment variable.")
}

if (!existsSync(resolve(cubiclesRoot, "package.json"))) {
  throw new Error(`Cubicles workspace not found at ${cubiclesRoot}`)
}

rmSync(packagedRuntimeRoot, { recursive: true, force: true })
rmSync(packagedScriptsRoot, { recursive: true, force: true })
mkdirSync(vendorRoot, { recursive: true })
mkdirSync(packagedScriptsRoot, { recursive: true })

execFileSync("npm", ["run", "build"], {
  cwd: cubiclesRoot,
  stdio: "inherit",
  env: process.env,
})

execFileSync("npm", ["pack", "-w", "@cubicles/core", "--pack-destination", vendorRoot], {
  cwd: cubiclesRoot,
  stdio: "inherit",
  env: process.env,
})

execFileSync("npm", ["pack", "-w", "@cubicles/server", "--pack-destination", vendorRoot], {
  cwd: cubiclesRoot,
  stdio: "inherit",
  env: process.env,
})

const vendorEntries = readdirSync(vendorRoot)
const coreTarball = vendorEntries.find((entry) => entry.startsWith("cubicles-core-") && entry.endsWith(".tgz"))
const serverTarball = vendorEntries.find((entry) => entry.startsWith("cubicles-server-") && entry.endsWith(".tgz"))

if (!coreTarball || !serverTarball) {
  throw new Error("Failed to create Cubicles runtime tarballs for packaging.")
}

writeFileSync(
  resolve(packagedRuntimeRoot, "package.json"),
  JSON.stringify(
    {
      name: "juice-cubicles-runtime",
      private: true,
      type: "module",
      dependencies: {
        "@cubicles/core": `file:./vendor/${coreTarball}`,
        "@cubicles/server": `file:./vendor/${serverTarball}`,
      },
    },
    null,
    2
  ) + "\n"
)

execFileSync("npm", ["install", "--omit=dev", "--no-package-lock"], {
  cwd: packagedRuntimeRoot,
  stdio: "inherit",
  env: process.env,
})

writeFileSync(
  resolve(packagedRuntimeRoot, "runtime-manifest.json"),
  JSON.stringify(
    {
      built_from: cubiclesRoot,
      packaged_at: new Date().toISOString(),
      includes: ["@cubicles/core", "@cubicles/server"],
      node_requirement: ">=22",
    },
    null,
    2
  ) + "\n"
)

for (const scriptName of ["build-cubicles-server.mjs", "run-cubicles-server.mjs"]) {
  cpSync(resolve(scriptDir, scriptName), resolve(packagedScriptsRoot, scriptName))
}

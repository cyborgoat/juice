import { useState } from "react"
import { toast } from "sonner"
import { ChevronRight } from "lucide-react"

import type { CubiclesProviderSpec, CubiclesSettingsResponse } from "@/lib/cubicles-api/types"
import type { CubiclesBackendState } from "@/lib/tauri/cubicles-backend"
import { getCubiclesBackendLogs, testCubiclesHealth } from "@/lib/tauri/cubicles-backend"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { InfoCard } from "./shared"

type OverviewTabProps = {
  settingsData: CubiclesSettingsResponse | undefined
  providerHints: CubiclesProviderSpec[]
  backendState: CubiclesBackendState
}

export function OverviewTab({ settingsData, providerHints, backendState }: OverviewTabProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoCard label="Default profile" value={settingsData?.default_profile ?? "Not set"} />
        <InfoCard label="Default workspace" value={settingsData?.default_workspace_id ?? "Not set"} />
        <InfoCard label="Cubicles home" value={settingsData?.cubicles_home ?? "—"} />
        <InfoCard label="Sessions database" value={settingsData?.sessions_db ?? "—"} />
      </div>

      {providerHints.length > 0 && (
        <Collapsible defaultOpen={providerHints.length <= 4}>
          <CollapsibleTrigger className="flex w-full items-center gap-1.5 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground [&[data-state=open]>svg]:rotate-90">
            <ChevronRight className="size-3 transition-transform" />
            Provider specs ({providerHints.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {providerHints.map((provider) => (
                <div key={provider.id} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{provider.label}</p>
                    <Badge variant="outline" className="rounded-full text-[10px]">{provider.provider}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{provider.description}</p>
                  {provider.model_examples.length ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">Examples: {provider.model_examples.join(", ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <BackendDiagnostics backendState={backendState} />
    </div>
  )
}

function BackendDiagnostics({ backendState }: { backendState: CubiclesBackendState }) {
  const [healthResult, setHealthResult] = useState<{
    ok: boolean
    latencyMs: number
    error?: string
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const logs = getCubiclesBackendLogs()

  async function handleTestHealth() {
    setIsTesting(true)
    try {
      const result = await testCubiclesHealth()
      setHealthResult(result)
      if (result.ok) {
        toast.success(`Backend healthy (${result.latencyMs}ms)`)
      } else {
        toast.error(`Backend unhealthy: ${result.error}`)
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Diagnostics
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                backendState.mode === "ready"
                  ? "bg-emerald-500"
                  : backendState.mode === "error"
                    ? "bg-red-500"
                    : "bg-amber-400"
              }`}
            />
            <span className="text-sm font-medium capitalize">{backendState.mode}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{backendState.detail}</p>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Health check
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 rounded-md text-xs"
              onClick={() => void handleTestHealth()}
              disabled={isTesting}
            >
              {isTesting ? "Testing…" : "Test connection"}
            </Button>
            {healthResult && (
              <span
                className={`text-xs ${healthResult.ok ? "text-emerald-500" : "text-red-400"}`}
              >
                {healthResult.ok
                  ? `OK (${healthResult.latencyMs}ms)`
                  : healthResult.error}
              </span>
            )}
          </div>
        </div>
      </div>

      {backendState.mode === "error" && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-sm font-medium text-red-400">Troubleshooting</p>
          <ul className="mt-1 space-y-0.5 text-xs leading-relaxed text-muted-foreground">
            <li>• Ensure Node.js is installed and available in your PATH</li>
            <li>• Check that the Cubicles runtime is bundled correctly</li>
            <li>• Try restarting the application</li>
            <li>• Review the backend logs below for specific errors</li>
          </ul>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Backend logs ({logs.length} lines) {showLogs ? "▾" : "▸"}
          </button>
          {showLogs && (
            <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg border border-border/50 bg-background/40 p-2 font-mono text-xs leading-5 text-muted-foreground">
              {logs.join("\n")}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

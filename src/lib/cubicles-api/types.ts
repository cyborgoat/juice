export type CubiclesHealthResponse = {
  status: string
  app: string
}

export type CubiclesSettingsResponse = {
  default_profile: string | null
  active_session_id: string | null
  default_workspace_id: string
  cubicles_home: string
  sessions_db: string
  providers: CubiclesProviderSpec[]
  tool_groups: CubiclesToolGroup[]
  frontend_path: string
  api_base: string
}

export type CubiclesProviderSpec = {
  id: string
  provider: string
  label: string
  description: string
  default_base_url: string
  model_examples: string[]
  api_key_envs: string[]
  api_key_optional: boolean
}

export type CubiclesToolGroup = {
  name: string
  description: string
  order: number
}

export type CubiclesToolRecord = {
  name: string
  description: string
  enabled: boolean
  source: string
  group: string
  category: string
  managed: boolean
  configurable: boolean
  cli_command: string | null
  signature: string | null
}

export type CubiclesToolCatalogResponse = {
  primitives: CubiclesToolRecord[]
  apis: CubiclesToolRecord[]
  extensions: CubiclesToolRecord[]
  skills: CubiclesToolRecord[]
  integrations: CubiclesToolRecord[]
}

export type CubiclesSessionResponse = {
  id: string
  name: string
  is_active: boolean
  workspace_id: string
  workspace_name: string
  workspace_path: string
  message_count: number
  updated_at: string
  session_round: number
  context_used_tokens: number
  context_window_tokens: number
  context_usage_percent: number
  compression_status: string
  last_compression_mode: string
  compressed_at: string | null
}

export type ToolReference = {
  name: string
  description: string
  kind: string
}

export type CubiclesSessionHistoryMessage = {
  role: string
  content: string
  created_at: string
}

export type CubiclesProfileSummary = {
  name: string
  provider: string
  model: string
  temperature: string
  context: string
  compression: string
  status: string
}

export type CubiclesProfileDetailResponse = {
  name: string
  data: Record<string, unknown>
  is_default: boolean
}

export type CubiclesProfileUpsertRequest = {
  data: Record<string, unknown>
  make_default?: boolean
}

export type CubiclesApiParameter = {
  name: string
  description: string
  type: string
  required: boolean
  location: "query" | "path" | "header" | "body"
}

export type CubiclesApiRecord = {
  name: string
  group: string
  description: string
  url: string
  enabled: boolean
  max_chars: number
  parameters: CubiclesApiParameter[]
}

export type CubiclesApiGroupSummary = {
  group: string
  summary: string
  api_count: number
  enabled_count: number
  names: string[]
}

export type CubiclesApiCreateRequest = {
  name: string
  group?: string | null
  description: string
  url: string
  method?: string
  enabled?: boolean
  max_chars?: number
  parameters?: CubiclesApiParameter[]
  profile_name?: string
}

export type CubiclesApiUpdateRequest = {
  group?: string | null
  description?: string | null
  url?: string | null
  enabled?: boolean | null
  max_chars?: number | null
  parameters?: CubiclesApiParameter[] | null
}

export type CubiclesMemoryDocument = {
  kind: string
  title: string
  path: string
  content: string
}

export type CubiclesSkillResponse = {
  name: string
  description: string
  instructions: string
  path: string
  baseDir: string
  enabled: boolean
  helperPaths: string[]
}

export type CubiclesSkillScanResponse = {
  discovered: Array<{
    name: string
    description: string
    path: string
  }>
  registered: CubiclesSkillResponse[]
}

export type CubiclesWorkspaceResponse = {
  id: string
  path: string
  name: string
  description: string
  exists: boolean
  is_default: boolean
}

export type CubiclesSlashCommand = {
  name: string
  description?: string
}

export type CubiclesSlashListResponse = {
  commands: CubiclesSlashCommand[]
}

export type CubiclesSlashExecutionRequest = {
  command: string
  session_id?: string | null
  profile_name?: string
  workspace_id?: string | null
}

export type CubiclesSlashExecutionResponse = {
  output: string[]
  session_id: string
  workspace_path: string
  continue: boolean
}

export type CubiclesPendingApproval = {
  approvalId: string
  sessionId: string
  pendingTool: Record<string, unknown>
  currentStep: number
  maxSteps: number
  profileName: string
  workspacePath: string
}

export type CubiclesChatStreamRequest = {
  message?: string | null
  session_id?: string | null
  profile_name?: string
  workspace_id?: string | null
  approval_id?: string | null
  approved?: boolean | null
  redirect_message?: string | null
}

export type CubiclesChatEvent =
  | { type: "session_context"; sessionId: string }
  | { type: "assistant_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "tool_preview"; content: string }
  | { type: "tool_call"; tool: Record<string, unknown>; detail: string; step: number; maxSteps: number }
  | { type: "tool_running"; name: string; detail: string }
  | { type: "tool_result"; name: string; returncode: number; output: string; durationMs?: number }
  | { type: "awaiting_approval"; approvalId: string; sessionId: string; pendingTool: Record<string, unknown> }
  | { type: "approval_applied"; approvalId: string; approved: boolean }
  | { type: "tool_skipped"; name: string }
  | { type: "usage"; usage: Record<string, number> }
  | { type: "compressing" }
  | { type: "turn_summary"; steps: number; toolsCalled: number; tokensUsed: number; errorCount: number }
  | { type: "done"; sessionId: string; workspacePath: string }
  | { type: "error"; message: string; hint?: string }

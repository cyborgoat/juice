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
  api_base: string
}

export type CubiclesSessionResponse = {
  id: string
  name: string
  is_active: boolean
  workspace_id: string
  workspace_name: string
  message_count: number
  updated_at: string
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
  | { type: "tool_result"; name: string; returncode: number; output: string }
  | { type: "awaiting_approval"; approvalId: string; sessionId: string; pendingTool: Record<string, unknown> }
  | { type: "approval_applied"; approvalId: string; approved: boolean }
  | { type: "tool_skipped"; name: string }
  | { type: "usage"; usage: Record<string, number> }
  | { type: "done"; sessionId: string; workspacePath: string }
  | { type: "error"; message: string; hint?: string }

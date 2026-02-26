export type TerminalType = 'kitty' | 'wezterm' | 'iterm2' | 'foot' | 'vte' | 'unknown'
export type NotificationProtocol = 'osc99' | 'osc777' | 'osc9' | 'os-fallback'

export type EventType = 'permission' | 'complete' | 'subagent_complete' | 'error' | 'question'

export interface EventConfig {
  sound: boolean
  notification: boolean
}

export interface FocusNotifyConfig {
  sound: boolean
  notification: boolean
  timeout: number
  showProjectName: boolean
  showSessionTitle: boolean
  events: Partial<Record<EventType, EventConfig | boolean>>
  messages: Partial<Record<EventType, string>>
}

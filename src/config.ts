import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { FocusNotifyConfig, EventType, EventConfig } from './types.js'

export const DEFAULT_CONFIG: FocusNotifyConfig = {
  sound: true,
  notification: true,
  timeout: 5,
  showProjectName: true,
  showSessionTitle: false,
  events: {},
  messages: {
    permission: 'OpenCode needs permission',
    complete: 'Session complete',
    subagent_complete: 'Agent finished',
    error: 'Session error',
    question: 'OpenCode has a question',
  },
}

export function loadConfig(): FocusNotifyConfig {
  const configPath =
    process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH ??
    join(homedir(), '.config', 'opencode', 'opencode-focus-notify.json')

  let userConfig: Partial<FocusNotifyConfig> = {}
  try {
    const raw = readFileSync(configPath, 'utf-8')
    userConfig = JSON.parse(raw) as Partial<FocusNotifyConfig>
  } catch {
    // File missing or invalid JSON — use defaults
  }

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    events: { ...DEFAULT_CONFIG.events, ...(userConfig.events ?? {}) },
    messages: { ...DEFAULT_CONFIG.messages, ...(userConfig.messages ?? {}) },
  }
}

export function resolveEventConfig(
  config: FocusNotifyConfig,
  eventType: EventType,
): EventConfig {
  const override = config.events[eventType]
  if (override === undefined) {
    return { sound: config.sound, notification: config.notification }
  }
  if (typeof override === 'boolean') {
    return { sound: override, notification: override }
  }
  return override
}

export function interpolateMessage(
  template: string,
  vars: { sessionTitle?: string; projectName?: string },
): string {
  let result = template
  result = result.replace(/\{sessionTitle\}/g, vars.sessionTitle ?? '')
  result = result.replace(/\{projectName\}/g, vars.projectName ?? '')
  // Clean trailing separators when placeholders resolve to empty
  result = result.replace(/[\s]*[:\-|][\s]*$/, '')
  result = result.trim()
  return result
}

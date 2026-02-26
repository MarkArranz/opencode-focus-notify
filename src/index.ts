import type { PluginInput, Hooks } from '@opencode-ai/plugin'
import { detectTerminal, getProtocol, getPlatform } from './detect.js'
import { loadConfig } from './config.js'
import { sendNotification } from './notify.js'
import { createEventHandler, type NotifyFn, type SoundFn } from './events.js'
import { playSound } from './sound.js'

export type { FocusNotifyConfig, EventType, EventConfig } from './types.js'

const PLUGIN_NAME = '[opencode-focus-notify]'

export default async function plugin(ctx: PluginInput): Promise<Hooks> {
  const terminal = detectTerminal()
  const protocol = getProtocol(terminal)
  const platform = getPlatform()
  const config = loadConfig()

  const notify: NotifyFn = async (options) => {
    await sendNotification(ctx, { ...options, terminal, protocol, platform })
  }

  const sound: SoundFn = async () => {
    await playSound(ctx, terminal, platform)
  }

  const handler = createEventHandler(ctx, config, notify, sound)

  console.info(`${PLUGIN_NAME} Initialized (terminal: ${terminal}, protocol: ${protocol})`)

  return {
    event: handler.event as Hooks['event'],
    'permission.ask': handler.permissionAsk as Hooks['permission.ask'],
    'tool.execute.before': handler.toolExecuteBefore as Hooks['tool.execute.before'],
  }
}

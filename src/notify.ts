import type { TerminalType, NotificationProtocol } from './types.js'
import type { PluginInput } from '@opencode-ai/plugin'

export interface NotificationOptions {
  terminal: TerminalType
  protocol: NotificationProtocol
  platform: 'macos' | 'linux'
  title: string
  body: string
  identifier: string
  timeout: number
}

/** Format OSC 777 escape sequence for WezTerm/foot/VTE */
export function formatOSC777(title: string, body: string): string {
  return `\x1b]777;notify;${title};${body}\x1b\\`
}

/** Format OSC 9 escape sequence for iTerm2 */
export function formatOSC9(body: string): string {
  return `\x1b]9;${body}\x1b\\`
}

/** Send a notification via the appropriate channel */
export async function sendNotification(
  ctx: PluginInput,
  options: NotificationOptions,
): Promise<void> {
  const { protocol, platform, title, body, identifier, timeout } = options
  try {
    switch (protocol) {
      case 'osc99':
        await ctx.$`kitten notify --app-name ${title} --sound-name system --identifier ${identifier} ${title} ${body}`.nothrow().quiet()
        break
      case 'osc777':
        process.stdout.write(formatOSC777(title, body))
        break
      case 'osc9':
        process.stdout.write(formatOSC9(body))
        break
      case 'os-fallback':
        if (platform === 'macos') {
          await ctx.$`osascript -e ${'display notification "' + body + '" with title "' + title + '"'}`.nothrow().quiet()
        } else {
          await ctx.$`notify-send -t ${String(timeout * 1000)} ${title} ${body}`.nothrow().quiet()
        }
        break
    }
  } catch {
    // Never throw — notification failure should never crash the plugin
  }
}

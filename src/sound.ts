import type { PluginInput } from '@opencode-ai/plugin'
import type { TerminalType } from './types.js'

/** Returns true because kitten notify handles sound via --sound-name system */
export function kittyHandlesSound(): true {
  return true
}

/**
 * Returns true if the terminal needs a separate sound playback command.
 * Kitty handles its own sound via kitten notify --sound-name system.
 */
export function shouldPlaySeparateSound(terminal: TerminalType): boolean {
  return terminal !== 'kitty'
}

/**
 * Play a system sound appropriate for the platform.
 * For kitty: no-op (kitten notify handles sound).
 * For macOS: afplay system sound.
 * For Linux: paplay freedesktop sound.
 */
export async function playSound(
  ctx: PluginInput,
  terminal: TerminalType,
  platform: 'macos' | 'linux',
): Promise<void> {
  if (!shouldPlaySeparateSound(terminal)) return
  try {
    if (platform === 'macos') {
      ctx.$`afplay /System/Library/Sounds/Glass.aiff`.nothrow().quiet()
    } else {
      ctx.$`paplay /usr/share/sounds/freedesktop/stereo/complete.oga`.nothrow().quiet()
    }
  } catch {
    // Sound failure should never crash the plugin
  }
}

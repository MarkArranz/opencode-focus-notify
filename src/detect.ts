import type { TerminalType, NotificationProtocol } from './types.js'

export function detectTerminal(): TerminalType {
  if (process.env.KITTY_WINDOW_ID) return 'kitty'
  if (process.env.WEZTERM_PANE || process.env.TERM_PROGRAM === 'WezTerm') return 'wezterm'
  if (process.env.ITERM_SESSION_ID || process.env.TERM_PROGRAM === 'iTerm.app') return 'iterm2'
  const term = process.env.TERM ?? ''
  if (term === 'foot' || term.startsWith('foot-')) return 'foot'
  if (process.env.VTE_VERSION) return 'vte'
  return 'unknown'
}

export function getProtocol(terminal: TerminalType): NotificationProtocol {
  switch (terminal) {
    case 'kitty': return 'osc99'
    case 'wezterm': return 'osc777'
    case 'iterm2': return 'osc9'
    case 'foot': return 'osc777'
    case 'vte': return 'osc777'
    case 'unknown': return 'os-fallback'
  }
}

export function getPlatform(): 'macos' | 'linux' {
  return process.platform === 'darwin' ? 'macos' : 'linux'
}

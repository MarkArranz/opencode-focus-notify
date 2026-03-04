#!/usr/bin/env node
import { execSync } from 'child_process'

// Only run on macOS
if (process.platform !== 'darwin') {
  console.log('opencode-focus-notify: Skipping terminal-notifier check (not macOS)')
  process.exit(0)
}

try {
  execSync('which terminal-notifier', { stdio: 'pipe' })
  console.log('opencode-focus-notify: terminal-notifier found.')
} catch {
  console.warn('opencode-focus-notify: terminal-notifier not found.')
  console.warn('Install via: brew install terminal-notifier')
  process.exit(0)
}

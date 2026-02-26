import { describe, it, expect, afterEach } from 'vitest'
import { loadConfig, DEFAULT_CONFIG, resolveEventConfig, interpolateMessage } from '../config.js'

describe('DEFAULT_CONFIG', () => {
  it('has sound enabled', () => expect(DEFAULT_CONFIG.sound).toBe(true))
  it('has notification enabled', () => expect(DEFAULT_CONFIG.notification).toBe(true))
  it('has timeout 5', () => expect(DEFAULT_CONFIG.timeout).toBe(5))
  it('has showProjectName true', () => expect(DEFAULT_CONFIG.showProjectName).toBe(true))
  it('has showSessionTitle false', () => expect(DEFAULT_CONFIG.showSessionTitle).toBe(false))
  it('has all 5 event messages', () => {
    expect(DEFAULT_CONFIG.messages.permission).toBeDefined()
    expect(DEFAULT_CONFIG.messages.complete).toBeDefined()
    expect(DEFAULT_CONFIG.messages.error).toBeDefined()
    expect(DEFAULT_CONFIG.messages.question).toBeDefined()
    expect(DEFAULT_CONFIG.messages.subagent_complete).toBeDefined()
  })
  it('messages are non-empty strings', () => {
    for (const [, msg] of Object.entries(DEFAULT_CONFIG.messages)) {
      expect(typeof msg).toBe('string')
      expect(msg!.length).toBeGreaterThan(0)
    }
  })
})

describe('loadConfig', () => {
  const origPath = process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH

  afterEach(() => {
    if (origPath === undefined) {
      delete process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH
    } else {
      process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH = origPath
    }
  })

  it('returns defaults when config file does not exist', () => {
    process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH = '/tmp/nonexistent-focus-config-xyz.json'
    const config = loadConfig()
    expect(config.sound).toBe(true)
    expect(config.notification).toBe(true)
    expect(config.timeout).toBe(5)
  })

  it('merges user config over defaults', () => {
    const { writeFileSync, unlinkSync } = require('node:fs')
    const tmpPath = '/tmp/test-focus-config-merge.json'
    writeFileSync(tmpPath, JSON.stringify({ timeout: 10, sound: false }), 'utf-8')
    process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH = tmpPath
    try {
      const config = loadConfig()
      expect(config.timeout).toBe(10)
      expect(config.sound).toBe(false)
      expect(config.notification).toBe(true) // still default
    } finally {
      unlinkSync(tmpPath)
    }
  })

  it('gracefully handles invalid JSON', () => {
    const { writeFileSync, unlinkSync } = require('node:fs')
    const tmpPath = '/tmp/test-focus-config-bad.json'
    writeFileSync(tmpPath, '{ invalid json }', 'utf-8')
    process.env.OPENCODE_FOCUS_NOTIFY_CONFIG_PATH = tmpPath
    try {
      const config = loadConfig()
      expect(config.sound).toBe(true) // falls back to default
    } finally {
      unlinkSync(tmpPath)
    }
  })
})

describe('resolveEventConfig', () => {
  it('returns global defaults when no event override', () => {
    const config = { ...DEFAULT_CONFIG, events: {} }
    const result = resolveEventConfig(config, 'complete')
    expect(result).toEqual({ sound: true, notification: true })
  })

  it('boolean false disables both sound and notification', () => {
    const config = { ...DEFAULT_CONFIG, events: { permission: false as const } }
    const result = resolveEventConfig(config, 'permission')
    expect(result).toEqual({ sound: false, notification: false })
  })

  it('boolean true enables both sound and notification', () => {
    const config = { ...DEFAULT_CONFIG, events: { complete: true as const } }
    const result = resolveEventConfig(config, 'complete')
    expect(result).toEqual({ sound: true, notification: true })
  })

  it('object override uses exact values', () => {
    const config = { ...DEFAULT_CONFIG, events: { error: { sound: false, notification: true } } }
    const result = resolveEventConfig(config, 'error')
    expect(result).toEqual({ sound: false, notification: true })
  })

  it('object override with sound only false', () => {
    const config = { ...DEFAULT_CONFIG, events: { question: { sound: false, notification: false } } }
    const result = resolveEventConfig(config, 'question')
    expect(result).toEqual({ sound: false, notification: false })
  })

  it('uses global sound=false when no event override', () => {
    const config = { ...DEFAULT_CONFIG, sound: false, events: {} }
    const result = resolveEventConfig(config, 'complete')
    expect(result).toEqual({ sound: false, notification: true })
  })
})

describe('interpolateMessage', () => {
  it('substitutes {sessionTitle}', () => {
    expect(interpolateMessage('Hello {sessionTitle}', { sessionTitle: 'World' })).toBe('Hello World')
  })

  it('substitutes {projectName}', () => {
    expect(interpolateMessage('{projectName}: done', { projectName: 'myapp' })).toBe('myapp: done')
  })

  it('cleans trailing colon separator when sessionTitle is empty', () => {
    expect(interpolateMessage('Done: {sessionTitle}', { sessionTitle: '' })).toBe('Done')
  })

  it('cleans trailing dash separator when placeholder is empty', () => {
    expect(interpolateMessage('Done - {sessionTitle}', { sessionTitle: '' })).toBe('Done')
  })

  it('cleans trailing pipe separator when placeholder is empty', () => {
    expect(interpolateMessage('Done | {sessionTitle}', { sessionTitle: '' })).toBe('Done')
  })

  it('returns empty string when all placeholders are empty', () => {
    expect(interpolateMessage('{projectName} | {sessionTitle}', {})).toBe('')
  })

  it('preserves text when no placeholders', () => {
    expect(interpolateMessage('Session complete', {})).toBe('Session complete')
  })

  it('substitutes both placeholders', () => {
    const result = interpolateMessage('{projectName}: {sessionTitle}', { projectName: 'app', sessionTitle: 'main' })
    expect(result).toBe('app: main')
  })
})

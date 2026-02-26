import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectTerminal, getProtocol, getPlatform } from '../detect.js'

describe('detectTerminal', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    delete process.env.KITTY_WINDOW_ID
    delete process.env.WEZTERM_PANE
    delete process.env.TERM_PROGRAM
    delete process.env.ITERM_SESSION_ID
    delete process.env.TERM
    delete process.env.VTE_VERSION
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('detects kitty via KITTY_WINDOW_ID', () => {
    process.env.KITTY_WINDOW_ID = '123'
    expect(detectTerminal()).toBe('kitty')
  })

  it('detects wezterm via WEZTERM_PANE', () => {
    process.env.WEZTERM_PANE = '0'
    expect(detectTerminal()).toBe('wezterm')
  })

  it('detects wezterm via TERM_PROGRAM=WezTerm', () => {
    process.env.TERM_PROGRAM = 'WezTerm'
    expect(detectTerminal()).toBe('wezterm')
  })

  it('detects iterm2 via ITERM_SESSION_ID', () => {
    process.env.ITERM_SESSION_ID = 'abc'
    expect(detectTerminal()).toBe('iterm2')
  })

  it('detects iterm2 via TERM_PROGRAM=iTerm.app', () => {
    process.env.TERM_PROGRAM = 'iTerm.app'
    expect(detectTerminal()).toBe('iterm2')
  })

  it('detects foot via TERM=foot', () => {
    process.env.TERM = 'foot'
    expect(detectTerminal()).toBe('foot')
  })

  it('detects foot via TERM starting with foot-', () => {
    process.env.TERM = 'foot-extra'
    expect(detectTerminal()).toBe('foot')
  })

  it('detects vte via VTE_VERSION', () => {
    process.env.VTE_VERSION = '6500'
    expect(detectTerminal()).toBe('vte')
  })

  it('falls back to unknown when no vars set', () => {
    expect(detectTerminal()).toBe('unknown')
  })

  it('kitty takes priority over wezterm', () => {
    process.env.KITTY_WINDOW_ID = '1'
    process.env.WEZTERM_PANE = '0'
    expect(detectTerminal()).toBe('kitty')
  })

  it('wezterm takes priority over iterm2', () => {
    process.env.WEZTERM_PANE = '0'
    process.env.ITERM_SESSION_ID = 'abc'
    expect(detectTerminal()).toBe('wezterm')
  })
})

describe('getProtocol', () => {
  it('maps kitty to osc99', () => expect(getProtocol('kitty')).toBe('osc99'))
  it('maps wezterm to osc777', () => expect(getProtocol('wezterm')).toBe('osc777'))
  it('maps iterm2 to osc9', () => expect(getProtocol('iterm2')).toBe('osc9'))
  it('maps foot to osc777', () => expect(getProtocol('foot')).toBe('osc777'))
  it('maps vte to osc777', () => expect(getProtocol('vte')).toBe('osc777'))
  it('maps unknown to os-fallback', () => expect(getProtocol('unknown')).toBe('os-fallback'))
})

describe('getPlatform', () => {
  it('returns macos or linux', () => {
    const p = getPlatform()
    expect(['macos', 'linux']).toContain(p)
  })

  it('returns macos on darwin', () => {
    if (process.platform === 'darwin') {
      expect(getPlatform()).toBe('macos')
    }
  })

  it('returns linux on non-darwin', () => {
    if (process.platform !== 'darwin') {
      expect(getPlatform()).toBe('linux')
    }
  })
})

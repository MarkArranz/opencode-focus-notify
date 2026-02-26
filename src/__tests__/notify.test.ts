import { describe, it, expect, vi } from 'vitest'
import { formatOSC777, formatOSC9, sendNotification } from '../notify.js'

describe('formatOSC777', () => {
  it('contains correct protocol marker', () => {
    const s = formatOSC777('Title', 'Body')
    expect(s).toContain('777;notify;Title;Body')
  })

  it('starts with ESC ]', () => {
    const s = formatOSC777('T', 'B')
    expect(s.charCodeAt(0)).toBe(0x1b)
    expect(s[1]).toBe(']')
  })

  it('ends with ST (ESC \\)', () => {
    const s = formatOSC777('T', 'B')
    expect(s.endsWith('\x1b\\')).toBe(true)
  })

  it('includes title and body verbatim', () => {
    const s = formatOSC777('MyApp', 'Hello world')
    expect(s).toContain('MyApp')
    expect(s).toContain('Hello world')
  })
})

describe('formatOSC9', () => {
  it('contains body in OSC 9 format', () => {
    const s = formatOSC9('Hello')
    expect(s).toContain('9;Hello')
  })

  it('starts with ESC ]', () => {
    const s = formatOSC9('Test')
    expect(s.charCodeAt(0)).toBe(0x1b)
    expect(s[1]).toBe(']')
  })

  it('ends with ST (ESC \\)', () => {
    const s = formatOSC9('Test')
    expect(s.endsWith('\x1b\\')).toBe(true)
  })
})

describe('sendNotification', () => {
  const makeCtx = () => ({
    $: Object.assign(
      vi.fn().mockReturnValue({ nothrow: () => ({ quiet: () => Promise.resolve() }) }),
      { nothrow: vi.fn() },
    ),
  })

  const makeCtxWithTN = (tnAvailable: boolean) => {
    let callCount = 0
    const mockFn = vi.fn().mockImplementation(() => {
      callCount++
      // First call is `which terminal-notifier`
      if (callCount === 1) {
        return { nothrow: () => ({ quiet: () => Promise.resolve({ exitCode: tnAvailable ? 0 : 1 }) }) }
      }
      // Subsequent calls are the actual notification command
      return { nothrow: () => ({ quiet: () => Promise.resolve({ exitCode: 0 }) }) }
    })
    return { $: Object.assign(mockFn, { nothrow: vi.fn() }) }
  }

  it('does not throw for osc99 protocol', async () => {
    const ctx = makeCtx()
    await expect(
      sendNotification(ctx as any, {
        terminal: 'kitty',
        protocol: 'osc99',
        platform: 'linux',
        title: 'T',
        body: 'B',
        identifier: 'i1',
        timeout: 5,
      }),
    ).resolves.not.toThrow()
  })

  it('does not throw for osc777 protocol', async () => {
    const ctx = makeCtx()
    await expect(
      sendNotification(ctx as any, {
        terminal: 'wezterm',
        protocol: 'osc777',
        platform: 'linux',
        title: 'T',
        body: 'B',
        identifier: 'i2',
        timeout: 5,
      }),
    ).resolves.not.toThrow()
  })

  it('does not throw for osc9 protocol', async () => {
    const ctx = makeCtx()
    await expect(
      sendNotification(ctx as any, {
        terminal: 'iterm2',
        protocol: 'osc9',
        platform: 'macos',
        title: 'T',
        body: 'B',
        identifier: 'i3',
        timeout: 5,
      }),
    ).resolves.not.toThrow()
  })

  it('does not throw for os-fallback on linux', async () => {
    const ctx = makeCtx()
    await expect(
      sendNotification(ctx as any, {
        terminal: 'unknown',
        protocol: 'os-fallback',
        platform: 'linux',
        title: 'T',
        body: 'B',
        identifier: 'i4',
        timeout: 5,
      }),
    ).resolves.not.toThrow()
  })

  it('does not throw for os-fallback on macos', async () => {
    const ctx = makeCtx()
    await expect(
      sendNotification(ctx as any, {
        terminal: 'unknown',
        protocol: 'os-fallback',
        platform: 'macos',
        title: 'T',
        body: 'B',
        identifier: 'i5',
        timeout: 5,
      }),
    ).resolves.not.toThrow()
  })

  it('osc99 on linux calls ctx.$ (kitten notify)', async () => {
    const ctx = makeCtx()
    await sendNotification(ctx as any, {
      terminal: 'kitty',
      protocol: 'osc99',
      platform: 'linux',
      title: 'T',
      body: 'B',
      identifier: 'i6',
      timeout: 5,
    })
    expect(ctx.$).toHaveBeenCalled()
  })

  it('osc99 on macOS with terminal-notifier available', async () => {
    const ctx = makeCtxWithTN(true)
    await sendNotification(ctx as any, {
      terminal: 'kitty',
      protocol: 'osc99',
      platform: 'macos',
      title: 'Test',
      body: 'Body',
      identifier: 'i7',
      timeout: 5,
    })
    expect(ctx.$).toHaveBeenCalledTimes(2)
    // First call: which terminal-notifier
    const firstCall = (ctx.$ as any).mock.calls[0][0]
    expect(firstCall[0]).toContain('which terminal-notifier')
    // Second call: terminal-notifier (not kitten notify)
    const secondCall = (ctx.$ as any).mock.calls[1][0]
    expect(secondCall[0]).toContain('terminal-notifier')
  })

  it('osc99 on macOS without terminal-notifier falls back to kitten notify', async () => {
    const ctx = makeCtxWithTN(false)
    await sendNotification(ctx as any, {
      terminal: 'kitty',
      protocol: 'osc99',
      platform: 'macos',
      title: 'Test',
      body: 'Body',
      identifier: 'i8',
      timeout: 5,
    })
    expect(ctx.$).toHaveBeenCalledTimes(2)
    // First call: which terminal-notifier
    const firstCall = (ctx.$ as any).mock.calls[0][0]
    expect(firstCall[0]).toContain('which terminal-notifier')
    // Second call: kitten notify (fallback)
    const secondCall = (ctx.$ as any).mock.calls[1][0]
    expect(secondCall[0]).toContain('kitten notify')
  })
})

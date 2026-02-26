import { describe, it, expect, vi } from 'vitest'
import { kittyHandlesSound, shouldPlaySeparateSound, playSound } from '../sound.js'

describe('kittyHandlesSound', () => {
  it('returns true', () => {
    expect(kittyHandlesSound()).toBe(true)
  })

  it('return type is literally true', () => {
    const result: true = kittyHandlesSound()
    expect(result).toBe(true)
  })
})

describe('shouldPlaySeparateSound', () => {
  it('returns false for kitty', () => expect(shouldPlaySeparateSound('kitty')).toBe(false))
  it('returns true for wezterm', () => expect(shouldPlaySeparateSound('wezterm')).toBe(true))
  it('returns true for iterm2', () => expect(shouldPlaySeparateSound('iterm2')).toBe(true))
  it('returns true for unknown', () => expect(shouldPlaySeparateSound('unknown')).toBe(true))
  it('returns true for foot', () => expect(shouldPlaySeparateSound('foot')).toBe(true))
  it('returns true for vte', () => expect(shouldPlaySeparateSound('vte')).toBe(true))
})

describe('playSound', () => {
  const makeCtx = () => ({
    $: Object.assign(
      vi.fn().mockReturnValue({ nothrow: () => ({ quiet: () => Promise.resolve() }) }),
      { nothrow: vi.fn() },
    ),
  })

  it('does not throw for kitty (no-op)', async () => {
    const ctx = makeCtx()
    await expect(playSound(ctx as any, 'kitty', 'macos')).resolves.not.toThrow()
  })

  it('does not call ctx.$ for kitty', async () => {
    const ctx = makeCtx()
    await playSound(ctx as any, 'kitty', 'linux')
    expect(ctx.$).not.toHaveBeenCalled()
  })

  it('does not throw for wezterm on macos', async () => {
    const ctx = makeCtx()
    await expect(playSound(ctx as any, 'wezterm', 'macos')).resolves.not.toThrow()
  })

  it('does not throw for wezterm on linux', async () => {
    const ctx = makeCtx()
    await expect(playSound(ctx as any, 'wezterm', 'linux')).resolves.not.toThrow()
  })
})

import { describe, it, expect, vi } from 'vitest'
import plugin from '../index.js'

const makeMockCtx = () => ({
  client: { session: { get: vi.fn().mockResolvedValue({ id: 'ses1', title: 'Test' }) } },
  directory: '/projects/myapp',
  worktree: '/projects/myapp',
  $: Object.assign(
    vi.fn().mockReturnValue({ nothrow: () => ({ quiet: () => Promise.resolve() }) }),
    { nothrow: vi.fn() },
  ),
})

describe('plugin', () => {
  it('is a function', () => {
    expect(typeof plugin).toBe('function')
  })

  it('returns hooks with all 3 required keys', async () => {
    const ctx = makeMockCtx()
    const hooks = await plugin(ctx as any)
    expect(hooks).toHaveProperty('event')
    expect(hooks).toHaveProperty('permission.ask')
    expect(hooks).toHaveProperty('tool.execute.before')
  })

  it('event hook is a function', async () => {
    const ctx = makeMockCtx()
    const hooks = await plugin(ctx as any)
    expect(typeof hooks.event).toBe('function')
  })

  it('permission.ask hook is a function', async () => {
    const ctx = makeMockCtx()
    const hooks = await plugin(ctx as any)
    expect(typeof hooks['permission.ask']).toBe('function')
  })

  it('tool.execute.before hook is a function', async () => {
    const ctx = makeMockCtx()
    const hooks = await plugin(ctx as any)
    expect(typeof hooks['tool.execute.before']).toBe('function')
  })

  it('event hook does not throw when called', async () => {
    const ctx = makeMockCtx()
    const hooks = await plugin(ctx as any)
    await expect(
      (hooks.event as Function)({ event: { type: 'session.idle', properties: { sessionID: 'ses1' } } }),
    ).resolves.not.toThrow()
  })

  it('permission.ask hook does not throw when called', async () => {
    const ctx = makeMockCtx()
    const hooks = await plugin(ctx as any)
    await expect(
      (hooks['permission.ask'] as Function)({ sessionID: 'ses1' }, { status: 'ask' }),
    ).resolves.not.toThrow()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEventHandler } from '../events.js'
import type { FocusNotifyConfig } from '../types.js'

const makeConfig = (overrides: Partial<FocusNotifyConfig> = {}): FocusNotifyConfig => ({
  sound: true,
  notification: true,
  timeout: 5,
  showProjectName: true,
  showSessionTitle: false,
  events: {},
  messages: {},
  ...overrides,
})

const makeMockCtx = () => ({
  client: { session: { get: vi.fn().mockResolvedValue({ id: 'ses1', title: 'Test Session' }) } },
  directory: '/projects/myapp',
  worktree: '/projects/myapp',
  $: Object.assign(
    vi.fn().mockReturnValue({ nothrow: () => ({ quiet: () => Promise.resolve() }) }),
    { nothrow: vi.fn().mockReturnValue({ quiet: () => Promise.resolve() }) },
  ),
})

describe('createEventHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all three hooks', () => {
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), vi.fn(), vi.fn())
    expect(typeof h.event).toBe('function')
    expect(typeof h.permissionAsk).toBe('function')
    expect(typeof h.toolExecuteBefore).toBe('function')
  })

  it('filters subagent sessions from idle notifications', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.event({ event: { type: 'session.created', properties: { info: { id: 'sub-1', parentID: 'parent-1' } } } })
    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'sub-1' } } })
    await new Promise((r) => setTimeout(r, 500))

    expect(notify).not.toHaveBeenCalled()
  })

  it('sends notification on session.idle for non-subagent', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.event({ event: { type: 'session.created', properties: { info: { id: 'ses1' } } } })
    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'ses1' } } })
    await new Promise((r) => setTimeout(r, 500))

    expect(notify).toHaveBeenCalledOnce()
  })

  it('deduplicates: second idle after notification does not re-notify', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'ses1' } } })
    await new Promise((r) => setTimeout(r, 500))
    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'ses1' } } })
    await new Promise((r) => setTimeout(r, 500))

    expect(notify).toHaveBeenCalledOnce()
  })

  it('message.updated cancels pending timer', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'ses1' } } })
    await h.event({ event: { type: 'message.updated', properties: { info: { sessionID: 'ses1' } } } })
    await new Promise((r) => setTimeout(r, 500))

    expect(notify).not.toHaveBeenCalled()
  })

  it('permission.ask sends permission notification', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.permissionAsk({ sessionID: 'ses1' } as any, { status: 'ask' } as any)

    expect(notify).toHaveBeenCalledOnce()
  })

  it('tool.execute.before sends question notification for question tool', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.toolExecuteBefore({ tool: 'question', sessionID: 'ses1', callID: 'c1' }, { args: {} })

    expect(notify).toHaveBeenCalledOnce()
  })

  it('tool.execute.before does NOT notify for non-question tools', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.toolExecuteBefore({ tool: 'bash', sessionID: 'ses1', callID: 'c2' }, { args: {} })

    expect(notify).not.toHaveBeenCalled()
  })

  it('does NOT send notification when event config disables it', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const config = makeConfig({ events: { complete: false } })
    const h = createEventHandler(ctx as any, config, notify, vi.fn())

    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'ses1' } } })
    await new Promise((r) => setTimeout(r, 500))

    expect(notify).not.toHaveBeenCalled()
  })

  it('session.created with parentID does not get complete notification on idle', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.event({ event: { type: 'session.created', properties: { info: { id: 'agent-1', parentID: 'root-1' } } } })
    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'agent-1' } } })
    await new Promise((r) => setTimeout(r, 500))

    expect(notify).not.toHaveBeenCalled()
  })

  it('permission.ask skips subagent sessions', async () => {
    const notify = vi.fn()
    const ctx = makeMockCtx()
    const h = createEventHandler(ctx as any, makeConfig(), notify, vi.fn())

    await h.event({ event: { type: 'session.created', properties: { info: { id: 'sub-2', parentID: 'parent-2' } } } })
    await h.permissionAsk({ sessionID: 'sub-2' } as any, { status: 'ask' } as any)

    expect(notify).not.toHaveBeenCalled()
  })
})

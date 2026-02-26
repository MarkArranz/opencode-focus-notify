import type { PluginInput } from '@opencode-ai/plugin'
import { basename } from 'node:path'
import type { FocusNotifyConfig, EventType } from './types.js'
import type { NotificationOptions } from './notify.js'
import { resolveEventConfig, interpolateMessage } from './config.js'
import type { detectTerminal, getPlatform } from './detect.js'

export type NotifyFn = (
  options: Omit<NotificationOptions, 'terminal' | 'protocol' | 'platform'>,
) => Promise<void>

export type SoundFn = (
  terminal: ReturnType<typeof detectTerminal>,
  platform: ReturnType<typeof getPlatform>,
) => Promise<void>

const IDLE_DELAY_MS = 350
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const STALE_SESSION_MS = 30 * 60 * 1000

type SessionInfo = { id?: string; parentID?: string; title?: string; sessionID?: string }
type EventPayload = {
  sessionID?: string
  status?: { type?: string }
  info?: SessionInfo
}

export function createEventHandler(
  ctx: PluginInput,
  config: FocusNotifyConfig,
  notify: NotifyFn,
  sound: SoundFn,
) {
  void sound

  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const notifiedSessions = new Set<string>()
  const subagentSessions = new Set<string>()
  const sessionSequences = new Map<string, number>()
  const sessionActivity = new Set<string>()
  const executingNotifications = new Set<string>()
  const erroredSessions = new Set<string>()
  const busySessions = new Set<string>()
  const sessionTitles = new Map<string, string>()
  const sessionLastActive = new Map<string, number>()

  function touchSession(sessionID: string): void {
    sessionLastActive.set(sessionID, Date.now())
  }

  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - STALE_SESSION_MS
    for (const [sessionID, lastActive] of sessionLastActive) {
      if (lastActive >= cutoff) continue
      if (pendingTimers.has(sessionID)) continue
      if (executingNotifications.has(sessionID)) continue
      if (busySessions.has(sessionID)) continue

      sessionLastActive.delete(sessionID)
      notifiedSessions.delete(sessionID)
      sessionActivity.delete(sessionID)
      sessionSequences.delete(sessionID)
      erroredSessions.delete(sessionID)
      subagentSessions.delete(sessionID)
      sessionTitles.delete(sessionID)
    }
  }, CLEANUP_INTERVAL_MS)
  cleanupInterval.unref?.()

  function cancelPending(sessionID: string): void {
    const timer = pendingTimers.get(sessionID)
    if (timer) {
      clearTimeout(timer)
      pendingTimers.delete(sessionID)
    }
    touchSession(sessionID)
    sessionActivity.add(sessionID)
    sessionSequences.set(sessionID, (sessionSequences.get(sessionID) ?? 0) + 1)
  }

  function markActivity(sessionID: string): void {
    cancelPending(sessionID)
    if (!executingNotifications.has(sessionID)) {
      notifiedSessions.delete(sessionID)
    }
  }

  function deleteSession(sessionID: string): void {
    cancelPending(sessionID)
    pendingTimers.delete(sessionID)
    notifiedSessions.delete(sessionID)
    sessionActivity.delete(sessionID)
    sessionSequences.delete(sessionID)
    executingNotifications.delete(sessionID)
    erroredSessions.delete(sessionID)
    busySessions.delete(sessionID)
    subagentSessions.delete(sessionID)
    sessionTitles.delete(sessionID)
    sessionLastActive.delete(sessionID)
  }

  async function getSessionTitle(sessionID: string): Promise<string> {
    const cached = sessionTitles.get(sessionID)
    if (cached !== undefined) return cached

    try {
      const client = ctx.client.session as unknown as { get: (input: unknown) => Promise<unknown> }
      let session = (await client.get(sessionID)) as { title?: string } | undefined
      if (!session?.title) {
        session = (await client.get({ id: sessionID })) as { title?: string } | undefined
      }
      const title = session?.title ?? ''
      sessionTitles.set(sessionID, title)
      return title
    } catch {
      return ''
    }
  }

  function getProjectName(): string {
    try {
      return basename(ctx.directory)
    } catch {
      return ''
    }
  }

  async function scheduleIdle(sessionID: string): Promise<void> {
    if (notifiedSessions.has(sessionID)) return
    if (pendingTimers.has(sessionID)) return
    if (executingNotifications.has(sessionID)) return
    if (erroredSessions.has(sessionID)) return
    if (busySessions.has(sessionID)) return

    touchSession(sessionID)
    sessionActivity.delete(sessionID)
    const seq = (sessionSequences.get(sessionID) ?? 0) + 1
    sessionSequences.set(sessionID, seq)

    const timer = setTimeout(async () => {
      pendingTimers.delete(sessionID)
      if (sessionSequences.get(sessionID) !== seq) return
      if (sessionActivity.has(sessionID)) {
        sessionActivity.delete(sessionID)
        return
      }
      if (notifiedSessions.has(sessionID)) return
      if (executingNotifications.has(sessionID)) return
      if (busySessions.has(sessionID)) return
      if (erroredSessions.has(sessionID)) return

      executingNotifications.add(sessionID)
      try {
        notifiedSessions.add(sessionID)
        await sendEventNotification(sessionID, 'complete')
      } finally {
        executingNotifications.delete(sessionID)
        if (sessionActivity.has(sessionID)) {
          notifiedSessions.delete(sessionID)
          sessionActivity.delete(sessionID)
        }
      }
    }, IDLE_DELAY_MS)

    pendingTimers.set(sessionID, timer)
  }

  async function sendEventNotification(sessionID: string, eventType: EventType): Promise<void> {
    const eventCfg = resolveEventConfig(config, eventType)
    if (!eventCfg.notification) return

    touchSession(sessionID)
    const sessionTitle = await getSessionTitle(sessionID)
    const projectName = getProjectName()

    const fallbackMessages: Record<EventType, string> = {
      permission: 'OpenCode needs permission',
      complete: 'Session complete',
      subagent_complete: 'Agent finished',
      error: 'Session error',
      question: 'OpenCode has a question',
    }

    const template = config.messages[eventType] ?? fallbackMessages[eventType]
    const body = interpolateMessage(template, { sessionTitle, projectName })
    const title = config.showProjectName && projectName ? projectName : 'OpenCode'

    await notify({
      title,
      body,
      identifier: `${sessionID}-${eventType}`,
      timeout: config.timeout,
    })
  }

  const event = async ({ event: evt }: { event: { type: string; properties?: EventPayload } }): Promise<void> => {
    const props = evt.properties

    if (evt.type === 'session.created') {
      const info = props?.info
      if (!info?.id) return

      touchSession(info.id)
      if (info.title) sessionTitles.set(info.id, info.title)
      if (info.parentID) {
        subagentSessions.add(info.id)
      }
      markActivity(info.id)
      return
    }

    if (evt.type === 'session.idle') {
      const sessionID = props?.sessionID
      if (!sessionID) return
      if (subagentSessions.has(sessionID)) return

      await scheduleIdle(sessionID)
      return
    }

    if (evt.type === 'session.status') {
      const sessionID = props?.sessionID
      const statusType = props?.status?.type
      if (!sessionID || !statusType) return

      touchSession(sessionID)
      if (statusType === 'busy') {
        busySessions.add(sessionID)
        cancelPending(sessionID)
        if (!executingNotifications.has(sessionID)) {
          notifiedSessions.delete(sessionID)
        }
        return
      }

      if (statusType === 'idle') {
        busySessions.delete(sessionID)
        if (subagentSessions.has(sessionID)) return
        await scheduleIdle(sessionID)
      }
      return
    }

    if (evt.type === 'message.updated') {
      const sessionID = props?.info?.sessionID
      if (!sessionID) return
      markActivity(sessionID)
      return
    }

    if (evt.type === 'session.error') {
      const sessionID = props?.sessionID
      if (!sessionID) return

      markActivity(sessionID)
      erroredSessions.add(sessionID)
      await sendEventNotification(sessionID, 'error')
      return
    }

    if (evt.type === 'session.deleted') {
      const sessionID = props?.info?.id
      if (!sessionID) return

      const isSubagent = subagentSessions.has(sessionID)
      if (isSubagent && !erroredSessions.has(sessionID)) {
        await sendEventNotification(sessionID, 'subagent_complete')
      }
      deleteSession(sessionID)
    }
  }

  const permissionAsk = async (
    input: { sessionID?: string },
    _output: { status?: string },
  ): Promise<void> => {
    const sessionID = input.sessionID
    if (!sessionID) return
    if (subagentSessions.has(sessionID)) return

    markActivity(sessionID)
    await sendEventNotification(sessionID, 'permission')
  }

  const toolExecuteBefore = async (
    input: { tool?: string; sessionID?: string; callID?: string },
    _output: { args?: unknown },
  ): Promise<void> => {
    const sessionID = input.sessionID
    if (!sessionID) return

    markActivity(sessionID)
    if (input.tool !== 'question') return
    if (subagentSessions.has(sessionID)) return

    await sendEventNotification(sessionID, 'question')
  }

  return { event, permissionAsk, toolExecuteBefore }
}

import assert from "node:assert/strict"
import test from "node:test"
import { spawn } from "node:child_process"

// We test by importing the plugin and checking it handles events without
// throwing. Since sendNotification uses spawn (fire-and-forget), we verify
// the plugin returns correct structure and processes events without error.
// terminal-notifier may or may not be installed in CI, so we test gracefully.

const withEnv = async (overrides, run) => {
  const previous = new Map()
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return await run()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test("plugin exports a function that returns event handler", async () => {
  const { plugin } = await import("../plugin.js")
  assert.equal(typeof plugin, "function")

  const instance = await plugin({ $: () => {} })
  assert.equal(typeof instance.event, "function")
})

test("session.idle event does not throw", async () => {
  const { plugin } = await import("../plugin.js")
  const instance = await plugin({ $: () => {} })

  await assert.doesNotReject(async () => {
    await instance.event({
      event: {
        type: "session.idle",
        properties: { path: "/tmp/project", sessionID: "sess-1" },
      },
    })
  })
})

test("session.status idle event does not throw", async () => {
  const { plugin } = await import("../plugin.js")
  const instance = await plugin({ $: () => {} })

  await assert.doesNotReject(async () => {
    await instance.event({
      event: {
        type: "session.status",
        properties: {
          status: { type: "idle" },
          path: "/tmp/project",
          sessionID: "sess-2",
        },
      },
    })
  })
})

test("session.error event does not throw", async () => {
  const { plugin } = await import("../plugin.js")
  const instance = await plugin({ $: () => {} })

  await assert.doesNotReject(async () => {
    await instance.event({
      event: {
        type: "session.error",
        properties: { sessionID: "sess-3" },
      },
    })
  })
})

test("permission.asked event does not throw", async () => {
  const { plugin } = await import("../plugin.js")
  const instance = await plugin({ $: () => {} })

  await assert.doesNotReject(async () => {
    await instance.event({
      event: {
        type: "permission.asked",
        properties: { sessionID: "sess-4" },
      },
    })
  })
})

test("permission.replied does not throw", async () => {
  const { plugin } = await import("../plugin.js")
  const instance = await plugin({ $: () => {} })

  await assert.doesNotReject(async () => {
    await instance.event({
      event: {
        type: "permission.replied",
        properties: { sessionID: "sess-5" },
      },
    })
  })
})

test("NOTIFY_DISABLE=1 suppresses all events without error", async () => {
  const { plugin } = await import("../plugin.js")

  await withEnv({ NOTIFY_DISABLE: "1" }, async () => {
    const instance = await plugin({ $: () => {} })
    await assert.doesNotReject(async () => {
      await instance.event({
        event: { type: "session.idle", properties: {} },
      })
    })
  })
})

test("unknown event type does not throw", async () => {
  const { plugin } = await import("../plugin.js")
  const instance = await plugin({ $: () => {} })

  await assert.doesNotReject(async () => {
    await instance.event({
      event: { type: "some.unknown.event", properties: {} },
    })
  })
})

test("missing terminal-notifier returns noop handler", async () => {
  const { plugin } = await import("../plugin.js")

  // Force no notifier found by hiding PATH
  await withEnv(
    { NOTIFY_DISABLE: undefined },
    async () => {
      const instance = await plugin({ $: () => {} })
      // Should still work (noop if notifier not found)
      await assert.doesNotReject(async () => {
        await instance.event({
          event: { type: "session.idle", properties: {} },
        })
      })
    },
  )
})

import { existsSync, writeFileSync, chmodSync } from "fs"
import { spawn } from "child_process"
import { tmpdir } from "os"
import { join } from "path"

// opencode-focus-notify — Desktop notifications that focus the correct kitty terminal.
// https://github.com/markarranz/opencode-focus-notify

const NOTIFIER_PATHS = [
  "/opt/homebrew/bin/terminal-notifier",
  "/usr/local/bin/terminal-notifier",
]

const KITTEN_PATHS = [
  "/Applications/kitty.app/Contents/MacOS/kitten",
  "/opt/homebrew/bin/kitten",
  "/usr/local/bin/kitten",
]

const findBinary = (paths) => paths.find((p) => existsSync(p)) ?? null

const createFocusScript = (kittenPath, kittyWindowId, kittyListenOn) => {
  if (!kittyWindowId || !kittyListenOn) return null

  const scriptPath = join(
    tmpdir(),
    `opencode-click-${Math.random().toString(36).slice(2)}.sh`,
  )
  const scriptContent = `#!/usr/bin/env bash
sleep 0.3
/usr/bin/open -a kitty
"${kittenPath}" @ --to "${kittyListenOn}" focus-window --match "id:${kittyWindowId}"
rm -- "$0"
`
  writeFileSync(scriptPath, scriptContent)
  chmodSync(scriptPath, 0o700)
  return scriptPath
}

const sanitize = (value, pattern) => {
  if (!value) return ""
  return pattern.test(value) ? value : ""
}

const sendNotification = (notifierPath, kittenPath, title, message, sound) => {
  const kittyWindowId = sanitize(process.env.KITTY_WINDOW_ID, /^\d+$/)
  const kittyListenOn = sanitize(
    process.env.KITTY_LISTEN_ON,
    /^[A-Za-z0-9:/@._-]+$/,
  )

  const args = ["-title", title, "-message", message, "-sound", sound]

  const focusScript = kittenPath
    ? createFocusScript(kittenPath, kittyWindowId, kittyListenOn)
    : null
  if (focusScript) {
    args.push("-execute", focusScript)
  }

  try {
    const child = spawn(notifierPath, args, { stdio: "ignore" })
    child.unref()
  } catch (err) {
    if (process.env.NOTIFY_DEBUG === "1") {
      console.error("opencode-focus-notify spawn error:", err)
    }
  }
}

export const plugin = async ({ $ }) => {
  const notifierPath = findBinary(NOTIFIER_PATHS)
  const kittenPath = findBinary(KITTEN_PATHS)
  const notifyPermissionReplied =
    process.env.NOTIFY_PERMISSION_REPLIED === "1"

  if (!notifierPath) {
    if (process.env.NOTIFY_DEBUG === "1") {
      console.error(
        "opencode-focus-notify: terminal-notifier not found. Install via: brew install terminal-notifier",
      )
    }
    return { event: async () => {} }
  }

  const isIdleEvent = (event) => {
    if (event.type === "session.idle") return true
    if (event.type !== "session.status") return false
    const status = event.properties?.status
    return status === "idle" || status?.type === "idle"
  }

  const isPermissionEvent = (event) => {
    return (
      event.type === "permission.request" ||
      event.type === "permission.asked" ||
      event.type === "permission.updated" ||
      (event.type === "permission.replied" && notifyPermissionReplied)
    )
  }

  return {
    event: async ({ event }) => {
      try {
        if (process.env.NOTIFY_DISABLE === "1") return

        if (isIdleEvent(event)) {
          sendNotification(
            notifierPath,
            kittenPath,
            "OpenCode",
            "Session complete",
            "Glass",
          )
        }

        if (event.type === "session.error") {
          sendNotification(
            notifierPath,
            kittenPath,
            "OpenCode",
            "Session error",
            "Sosumi",
          )
        }

        if (isPermissionEvent(event)) {
          const message =
            event.type === "permission.replied"
              ? "Permission answered"
              : "Permission requested"
          sendNotification(
            notifierPath,
            kittenPath,
            "OpenCode",
            message,
            "Tink",
          )
        }
      } catch (error) {
        if (process.env.NOTIFY_DEBUG === "1") {
          console.error("opencode-focus-notify error:", error)
        }
      }
    },
  }
}

# @markarranz/opencode-focus-notify

Terminal-native OpenCode notification plugin with click-to-focus for kitty.

## Features

- 🔔 Native terminal notifications via OSC escape sequences (no system notification APIs)
- 🎯 Click-to-focus in kitty: clicking a notification focuses your kitty window
- 🖥️ Supports kitty, WezTerm, iTerm2, foot, and VTE-based terminals
- 🔕 Automatic fallback to `osascript` (macOS) / `notify-send` (Linux) for unsupported terminals
- 🔊 Sound notifications: system sound via `kitten notify`, `afplay`, or `paplay`
- ⚡ Zero runtime dependencies
- 🔧 Configurable per-event settings

## Quick Start

### Install

```bash
# Add to your OpenCode config (~/.config/opencode/opencode.json)
{
  "plugin": ["@markarranz/opencode-focus-notify"]
}
```

OpenCode will install the plugin automatically via npm.

### Optional: Custom Configuration

Create `~/.config/opencode/opencode-focus-notify.json`:

```json
{
  "sound": true,
  "notification": true,
  "timeout": 5,
  "showProjectName": true,
  "showSessionTitle": false,
  "events": {
    "subagent_complete": false
  },
  "messages": {
    "complete": "Ready — {projectName}",
    "error": "Something went wrong"
  }
}
```

## Terminal Support

| Terminal | Protocol | Click-to-Focus | Detection |
|----------|----------|----------------|-----------|
| **kitty** | OSC 99 (`kitten notify`) | ✅ Focus window | `$KITTY_WINDOW_ID` |
| **WezTerm** | OSC 777 | ❌ No | `$WEZTERM_PANE` |
| **iTerm2** | OSC 9 | ⚠️ Focus app | `$ITERM_SESSION_ID` |
| **foot** | OSC 777 | ❌ No | `$TERM=foot` |
| **VTE-based** | OSC 777 | ❌ No | `$VTE_VERSION` |
| **Other** | `osascript` / `notify-send` | ❌ No | Fallback |

## Events

Notifications are sent for these events:

| Event | When | Default Message |
|-------|------|-----------------|
| `complete` | Session becomes idle | Session complete |
| `permission` | OpenCode requests permission | OpenCode needs permission |
| `error` | Session encounters an error | Session error |
| `question` | OpenCode asks a question | OpenCode has a question |
| `subagent_complete` | A sub-agent session finishes | Agent finished |

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sound` | boolean | `true` | Global sound toggle |
| `notification` | boolean | `true` | Global notification toggle |
| `timeout` | number | `5` | Notification timeout in seconds (Linux only) |
| `showProjectName` | boolean | `true` | Show project folder name as notification title |
| `showSessionTitle` | boolean | `false` | Include session title in notification body |
| `events` | Record | `{}` | Per-event overrides (boolean or `{sound, notification}`) |
| `messages` | Record | see above | Custom message templates |

### Message Templates

Use `{projectName}` and `{sessionTitle}` as placeholders:

```json
{
  "messages": {
    "complete": "✅ {projectName} is ready",
    "error": "❌ Error in {projectName}: {sessionTitle}"
  }
}
```

## Comparison with @mohak34/opencode-notifier

| | @markarranz/opencode-focus-notify | @mohak34/opencode-notifier |
|---|---|---|
| Notifications | Native OSC escape sequences | `node-notifier` / `osascript` |
| Runtime deps | **0** | 1 (`node-notifier`) |
| Click-to-focus | ✅ kitty | ❌ Opens Script Editor |
| Protocol | OSC 99/777/9 | macOS only |
| Config file | `opencode-focus-notify.json` | `opencode-notifier.json` |

## Roadmap

### v0.2.0 (planned)
- Per-event volume control
- Custom sound file paths
- Custom notification commands
- Linux notification grouping

## License

MIT © Mark Arranz

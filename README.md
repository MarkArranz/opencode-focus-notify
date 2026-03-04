# @markarranz/opencode-focus-notify

Desktop notifications for [OpenCode](https://github.com/nicepkg/opencode) with click-to-focus for kitty terminal.

When OpenCode finishes a task, encounters an error, or needs your attention, you get a native macOS notification. Click it to switch directly to the correct kitty window and tab.

## Requirements

- macOS
- [kitty](https://sw.kovidgoyal.net/kitty/) terminal
- [terminal-notifier](https://github.com/julienXX/terminal-notifier): `brew install terminal-notifier`
- kitty remote control enabled (`allow_remote_control yes` in kitty.conf)

## Install

```bash
opencode plugin install @markarranz/opencode-focus-notify
```

## Events

| Event | Sound | Message |
|-------|-------|---------|
| `session.idle` | Glass | Session complete |
| `session.error` | Sosumi | Session error |
| `permission.asked` | Tink | Permission requested |
| `permission.replied` | Tink | Permission answered |

## Click-to-Focus

Clicking a notification:
1. Activates kitty (`open -a kitty`)
2. Focuses the exact kitty window/tab that triggered the event (`kitten @ focus-window`)

This uses kitty's remote control protocol with `KITTY_WINDOW_ID` and `KITTY_LISTEN_ON` environment variables.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_DISABLE` | — | Set to `1` to suppress all notifications |
| `NOTIFY_PERMISSION_REPLIED` | — | Set to `1` to also notify on permission replies |
| `NOTIFY_DEBUG` | — | Set to `1` for error logging |

## How It Works

The plugin spawns `terminal-notifier` with the `-execute` flag pointing to a temporary focus script. When you click the notification, macOS runs the script which activates kitty and focuses the correct window via `kitten @ focus-window --match id:<window_id>`.

## License

MIT

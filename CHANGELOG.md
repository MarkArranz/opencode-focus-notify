# Changelog

## [0.1.0] - 2026-02-26

### Added
- Terminal-native notifications via OSC 99 (kitty), OSC 777 (WezTerm/foot/VTE), OSC 9 (iTerm2)
- Click-to-focus support for kitty via `kitten notify`
- OS fallback notifications via `osascript` (macOS) and `notify-send` (Linux)
- 5 notification events: session complete, permission request, session error, question, subagent complete
- Configurable per-event settings with boolean shorthand or `{sound, notification}` objects
- Message templates with `{sessionTitle}` and `{projectName}` placeholders
- System sound via `--sound-name system` (kitty), `afplay` (macOS), `paplay` (Linux)
- Zero runtime dependencies

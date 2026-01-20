# Changelog

All notable changes to the burntop CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of burntop CLI
- Automatic detection and parsing of AI coding tool usage data
- Support for Claude Code, Cursor, Gemini CLI, Aider, and Continue
- Authentication via device code OAuth flow
- Local data scanning with `burntop scan` command
- Cloud sync with `burntop sync` command
- Detailed statistics display with `burntop stats` command
- Interactive TUI dashboard with `burntop tui` command
- Achievement tracking with `burntop achievements` command
- Global leaderboard viewing with `burntop leaderboard` command
- Shareable stats cards with `burntop share` command
- JSON export functionality with `burntop export` command
- Theme customization with `burntop theme` command
- User authentication commands: `login`, `logout`, `whoami`
- Credential management in `~/.config/burntop/`
- Privacy-first local-only processing
- Beautiful terminal output with color themes
- Verbose mode for debugging
- Filtering by source, period, and category
- Dry-run mode for testing sync without uploading

### Security

- Secure credential storage with file permissions 600
- Local-first processing with opt-in cloud sync
- No telemetry or tracking

## [0.0.1] - TBD

Initial release (not yet published to npm).

[Unreleased]: https://github.com/agusmdev/burntop/compare/cli-v0.0.1...HEAD
[0.0.1]: https://github.com/agusmdev/burntop/releases/tag/cli-v0.0.1

# burntop CLI

> Track your AI tool usage and compete on the leaderboard - right from your terminal

[![npm version](https://img.shields.io/npm/v/burntop.svg)](https://www.npmjs.com/package/burntop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is burntop?

burntop is a gamified AI usage tracking platform for developers. It automatically tracks your usage across multiple AI coding tools, giving you insights into your productivity while making it fun through achievements, streaks, and global leaderboards.

The CLI tool runs locally on your machine, scanning usage data from popular AI coding assistants and syncing it to your burntop.dev profile.

## Features

- **Automatic Detection** - Scans local data from 10+ AI tools including Claude Code, Cursor, Cline, and more
- **Rich Statistics** - View token usage, costs, model breakdowns, and trends
- **Achievements** - Track your progress and unlock badges
- **Leaderboards** - See how you rank globally
- **Streak Tracking** - Keep your daily usage streak alive
- **Privacy First** - All data processing happens locally, you control what gets synced

## Installation

**Note:** The CLI requires [Bun](https://bun.sh) runtime for SQLite parsing features.

### Quick Run (No Install)

Run burntop directly without installing:

```bash
bunx burntop
```

This is the easiest way to use burntop - no PATH configuration needed.

### Global Installation

Install globally to use the `burntop` command anywhere:

```bash
# Using bun (recommended)
bun add -g burntop

# Using npm
npm install -g burntop

# Using pnpm
pnpm add -g burntop
```

## Quick Start

1. **Authenticate with GitHub**

```bash
bunx burntop login
# or if installed globally: burntop login
```

This will open your browser to authenticate via GitHub OAuth. Once complete, your credentials are stored in `~/.config/burntop/credentials.json`.

2. **View your local AI usage**

```bash
bunx burntop stats
```

This shows you detailed statistics from your local AI usage data.

3. **Sync your data to the cloud**

```bash
bunx burntop sync
```

Your usage data is now on burntop.dev! Visit your profile to see detailed stats, achievements, and your leaderboard position.

## Commands

### `burntop` (default: stats)

Show detailed AI usage statistics from your local machine.

```bash
burntop                        # Show all stats
burntop stats                  # Explicit stats command
burntop stats --verbose        # Show additional details
burntop stats --source claude-code  # Only show Claude Code stats
burntop stats --period week    # Show stats for this week (day, week, month, all)
```

### `burntop login`

Authenticate with your burntop.dev account.

```bash
burntop login
```

### `burntop logout`

Clear stored credentials and log out.

```bash
burntop logout
```

### `burntop sync`

Upload your local AI usage data to burntop.dev.

```bash
burntop sync                   # Sync all sources
burntop sync --verbose         # Show detailed sync progress
burntop sync --source aider    # Only sync Aider data
burntop sync --dry-run         # Preview what would be synced without uploading
```

## Supported AI Tools

The CLI automatically detects and parses usage data from:

| Tool            | Location                                               | Notes                      |
| --------------- | ------------------------------------------------------ | -------------------------- |
| **Aider**       | `~/.aider/*.jsonl`                                     | Via `--analytics-log` flag |
| **Claude Code** | `~/.claude/projects/**/*.jsonl`                        | Automatically scanned      |
| **Cline**       | VS Code `globalStorage/saoudrizwan.claude-dev/`        | VS Code extension          |
| **Codex**       | `~/.codex/`                                            | OpenAI Codex CLI           |
| **Continue**    | `~/.continue/sessions/*.json`                          | Session data               |
| **Cursor**      | `~/Library/Application Support/Cursor/.../state.vscdb` | SQLite database            |
| **Droid**       | `~/.factory/sessions/*.settings.json`                  | Session files              |
| **Gemini CLI**  | `~/.gemini/tmp/*/chats/session-*.json`                 | Session files              |
| **Kilo Code**   | VS Code `globalStorage/kilocode.kilo-code/`            | VS Code extension          |
| **OpenCode**    | `~/.local/share/opencode/storage/message/`             | Message storage            |
| **Roo Code**    | VS Code `globalStorage/rooveterinaryinc.roo-cline/`    | VS Code extension          |

Don't see your tool? [Open an issue](https://github.com/agusmdev/burntop/issues) and we'll add it!

## Configuration

Configuration is stored in `~/.config/burntop/`:

```
~/.config/burntop/
├── credentials.json    # OAuth tokens (keep secure!)
└── config.json         # User preferences
```

### Environment Variables

- `BURNTOP_API_URL` - Override the API endpoint (default: `https://api.burntop.dev`)
  - For local development: `export BURNTOP_API_URL=http://localhost:8000`
  - The CLI will use the FastAPI backend at `/api/v1/*` endpoints

## Privacy & Security

- **Local First**: All scanning and processing happens on your machine
- **Opt-in Sync**: Data is only uploaded when you run `burntop sync`
- **Secure Storage**: Credentials are stored locally with file permissions 600
- **No Tracking**: The CLI doesn't phone home or send telemetry
- **Open Source**: Inspect the code yourself

## Troubleshooting

### Prerequisites

The CLI requires bun to be installed. Install it from [bun.sh](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

### Command not found after installation

If you installed globally but `burntop` command is not found, you can either:

**Option 1: Use `bunx` (no PATH needed)**

```bash
bunx burntop stats
```

**Option 2: Add the global bin directory to your PATH**

For bun:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

For npm:

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

For pnpm:

```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to persist.

### No data found

Make sure you've used one of the supported AI tools recently. The CLI looks for data in standard locations:

```bash
burntop stats --verbose    # See what's being scanned
```

### Authentication issues

If `burntop login` fails, try:

1. Clear existing credentials: `burntop logout`
2. Log in again: `burntop login`
3. Check your internet connection
4. Ensure you're using the latest version: `bunx burntop@latest` or `bun add -g burntop@latest`

### Sync errors

If sync fails:

```bash
burntop sync --dry-run    # Test without uploading
burntop stats --verbose   # Check local data
```

## Development

### Building from source

```bash
git clone https://github.com/agusmdev/burntop.git
cd burntop/packages/cli
bun install
bun run build
```

### Testing locally

There are several ways to test the CLI during development:

#### 1. Run directly (without global install)

```bash
bun run test:local [command] [args]
```

This builds the CLI and runs it directly from `./dist/index.js`. Example:

```bash
bun run test:local stats
bun run test:local --help
```

#### 2. Link globally (recommended for full testing)

Install the CLI globally from your local development directory:

```bash
bun run link
```

Now you can use `burntop` command anywhere on your system, and it will use your local development version:

```bash
burntop stats
burntop login
burntop --help
```

When you make changes, rebuild to see them:

```bash
bun run build
burntop stats  # Now uses updated code
```

To unlink when done:

```bash
bun run unlink
```

#### 3. Watch mode (for rapid development)

For rapid iteration without linking:

```bash
bun run dev    # Watch mode - rebuilds on file changes
```

Then in another terminal:

```bash
./dist/index.js stats  # Run the CLI directly
```

### Testing with Local Backend

To test the CLI against a local FastAPI backend:

1. Start the FastAPI backend (in `packages/backend`):

```bash
cd packages/backend
uv run uvicorn src.app.main:app --reload
```

2. Set the API URL environment variable:

```bash
export BURNTOP_API_URL=http://localhost:8000
```

3. Run CLI commands:

```bash
burntop login    # Authenticate with local backend
burntop sync     # Sync to local backend
```

The CLI will now connect to `http://localhost:8000/api/v1/*` endpoints instead of production.

## Contributing

Contributions are welcome! Please see the [Contributing Guide](../../CONTRIBUTING.md).

To add a new parser for an AI tool:

1. Create `src/parsers/your-tool.ts`
2. Implement the `Parser` interface from `src/parsers/types.ts`
3. Add tests
4. Submit a PR

## License

MIT © burntop

## Links

- [burntop.dev](https://burntop.dev) - Web platform
- [Documentation](https://burntop.dev/docs) - Full docs
- [Issues](https://github.com/agusmdev/burntop/issues) - Bug reports
- [Discussions](https://github.com/agusmdev/burntop/discussions) - Community

---

Made with fire by developers, for developers

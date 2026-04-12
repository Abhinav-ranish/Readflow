# readflow-md

Share markdown files instantly from the terminal. Documents appear on [readflow.aranish.uk](https://readflow.aranish.uk) with a shareable link.

## Install

```bash
npm install -g readflow-md
```

Or use directly with `npx`:

```bash
npx readflow-md share README.md
```

## Quick Start

```bash
# Share a file (anonymous)
readflow share README.md

# Log in to link shares to your account
readflow login

# Share with a title
readflow share docs/api.md --title "API Reference"
```

## Commands

### `share <file>`

Upload a markdown file and get a shareable URL.

```bash
readflow share README.md
readflow share README.md --title "My Project"
readflow share README.md --password secret
readflow share README.md --expires 7d
readflow share README.md --update        # upsert by title
cat notes.md | readflow share -          # pipe from stdin
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--title` | `-t` | Set document title |
| `--password` | `-p` | Password-protect the document |
| `--expires` | `-e` | Set expiry (`1h`, `24h`, `7d`) |
| `--update` | `-u` | Update existing doc instead of creating new |
| `--token` | | One-time token override |

### `login`

Authenticate via browser. Opens a browser window to log in with GitHub/Google. Once authenticated, all shares are linked to your account and appear in your dashboard.

```bash
readflow login
```

### `config`

Manage CLI settings.

```bash
readflow config --show           # Show current config
readflow config --token <key>    # Save an agent token
readflow config --clear          # Remove token (go anonymous)
```

You can generate an agent token from your [Settings page](https://readflow.aranish.uk/settings).

### `install`

Set up Readflow in a project. Creates a `.readflow/` directory with:

- `CLAUDE.md` — commit guidelines and document sharing instructions for AI agents
- `post-commit` — git hook that auto-uploads tracked markdown files on commit
- `config.json` — project settings and tracked file list

```bash
readflow install
readflow install --reconfigure   # Re-pick tracked files
```

After installing, enable auto-upload:

```bash
cp .readflow/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

## Authentication

There are three ways to authenticate:

1. **Browser login** — `readflow login` opens a browser flow. Token is saved to `~/.readflow/config.json`.
2. **Agent token** — Generate one in [Settings](https://readflow.aranish.uk/settings), then `readflow config --token <key>`.
3. **Environment variable** — Set `READFLOW_TOKEN` for CI/scripts.

Without authentication, shares are anonymous (no dashboard, no editing).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `READFLOW_TOKEN` | Agent token (overrides saved config) |
| `READFLOW_API_URL` | Override API base URL (default: `https://readflow.aranish.uk`) |

## Examples

```bash
# Share and get a link
readflow share README.md
#  ✓ Shared successfully!
#  URL: https://readflow.aranish.uk/s/abc123

# Password-protected doc that expires in 24 hours
readflow share secret.md --password hunter2 --expires 24h

# Update a doc every time you push
readflow share CHANGELOG.md --title "Changelog" --update

# Pipe from another command
gh release view --json body -q .body | readflow share - --title "Release Notes"
```

## License

MIT

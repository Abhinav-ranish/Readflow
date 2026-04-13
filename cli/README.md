# readflow-md

Share and fetch markdown files from the terminal. Documents appear on [readflow.aranish.uk](https://readflow.aranish.uk) with a shareable link.

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

# Fetch a doc back
readflow fetch "API Reference" -o api.md
```

## Commands

### `share <file>`

Upload a markdown file and get a shareable URL.

```bash
readflow share README.md
readflow share README.md --title "My Project"
readflow share README.md --password secret
readflow share README.md --expires 7d
readflow share README.md --update        # upsert by slug
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

### `fetch [query]`

Download a document from Readflow. Supports interactive browsing, search, and direct ID lookup.

```bash
# Interactive — browse all your docs with arrow keys + search
readflow fetch

# Search by title or folder name
readflow fetch "security audit"
readflow fetch myproject/README

# Direct ID or URL
readflow fetch abc123
readflow fetch https://readflow.aranish.uk/s/abc123

# Save to file
readflow fetch "API docs" -o api-docs.md

# List all docs grouped by folder (no download)
readflow fetch --list

# Fetch as JSON with metadata
readflow fetch abc123 --json

# Password-protected docs
readflow fetch abc123 --password secret
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--output` | `-o` | Save to file instead of printing to stdout |
| `--password` | `-p` | Password for protected documents |
| `--json` | | Output as JSON with title, date, and slug |
| `--list` | `-l` | List all docs grouped by folder |

**How search works:**

When you pass a search term, the CLI queries your account's documents by title, folder name, and slug. If there's one match, it downloads immediately. If there are multiple matches and you're in a terminal, an interactive picker appears where you can type to filter further and press Enter to select.

You can also pass a direct document ID or full URL — the CLI detects the format automatically and skips the search.

### `login`

Authenticate via browser. Opens a browser window to log in with GitHub/Google. Once authenticated, all shares are linked to your account and `fetch` can browse your docs.

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

The install command scans your project for `.md` files and shows an interactive checkbox picker:

```
  Track files for auto-upload (8 found)

  ❯ [✓] README.md (always)
    [ ] docs/api.md
    [ ] docs/changelog.md
    [✓] CONTRIBUTING.md
```

Use arrow keys to navigate, Space to toggle, `a` to select all, `n` to deselect all, Enter to confirm.

After installing, enable auto-upload on commit:

```bash
cp .readflow/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

## Authentication

There are three ways to authenticate:

1. **Browser login** — `readflow login` opens a browser flow. Token is saved to `~/.readflow/config.json`.
2. **Agent token** — Generate one in [Settings](https://readflow.aranish.uk/settings), then `readflow config --token <key>`.
3. **Environment variable** — Set `READFLOW_TOKEN` for CI/scripts.

Without authentication, `share` works anonymously (no dashboard, no editing) and `fetch` requires a direct document ID.

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

# Download a doc by searching your account
readflow fetch "changelog" -o CHANGELOG.md

# Browse all docs interactively
readflow fetch

# List everything grouped by project folder
readflow fetch --list
```

## License

MIT

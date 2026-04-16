# readflow-md

Share markdown files and project knowledge from the terminal. Documents appear on [readflow.aranish.uk](https://readflow.aranish.uk) with a shareable link.

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

# Upload your project's knowledge base
readflow brain

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
cat notes.md | readflow share            # pipe from stdin
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--title` | `-t` | Set document title |
| `--password` | `-p` | Password-protect the document |
| `--expires` | `-e` | Set expiry (`1h`, `24h`, `7d`) |
| `--update` | `-u` | Update existing doc instead of creating new |
| `--token` | | One-time token override |
| `--help` | `-h` | Show command help |

### `brain`

Upload a curated project knowledge base to Readflow. This is intentional knowledge capture — not a repo scrape.

```bash
# Scan knowledge folders, review, and upload
readflow brain

# Preview included/excluded files with reasons
readflow brain --dry-run

# Re-configure which files to include
readflow brain --config

# Start fresh — delete brain.json
readflow brain --reset
```

**Default behavior:**

The brain prioritizes content from knowledge-oriented locations:

- **Knowledge roots** (auto-scanned): `docs/`, `brain/`, `notes/`, `knowledge/`, `wiki/`, `design/`, `specs/`, `rfcs/`, `adrs/`
- **Key root docs** (auto-included): `README.md`, `CHANGELOG.md`, `ROADMAP.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `PRD*.md`, `ADR*.md`, `RFC*.md`
- **Markdown/text** files are included by default from these locations
- **Structured files** (yaml, json, toml) are only included when inside a knowledge folder — `tsconfig.json`, `package.json`, `docker-compose.yml` etc. are excluded

**Always excluded:**

`.env*`, `*.key`, `*.pem`, `*.log`, lockfiles, binaries, images, build output (`dist/`, `build/`, `.next/`), `node_modules/`, `vendor/`, `coverage/`, `.git/`, files > 256KB

**Customization:**

| File | Purpose |
|------|---------|
| `.brainignore` | Exclude patterns (gitignore syntax) |
| `.braininclude` | If present, ONLY these patterns are considered |
| `.readflow/brain.json` | Saved selection from interactive picker |

The `--dry-run` flag shows exactly what would be included and excluded, with reasons for each decision.

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--dry-run` | `-n` | Preview included/excluded with reasons |
| `--config` | `-c` | Re-pick which files to include |
| `--reset` | | Delete brain.json and start fresh |
| `--help` | `-h` | Show command help |

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
| `--help` | `-h` | Show command help |

**How search works:**

When you pass a search term, the CLI queries your account's documents by title, folder name, and slug. If there's one match, it downloads immediately. If there are multiple matches and you're in a terminal, an interactive picker appears where you can type to filter further and press Enter to select.

You can also pass a direct document ID or full URL — the CLI detects the format automatically and skips the search.

### `login`

Authenticate via browser. Opens a browser window to log in with GitHub/Google. Once authenticated, all shares are linked to your account and `fetch` can browse your docs.

```bash
readflow login
```

### `install`

Set up Readflow in a project. Creates agent skill files and a git hook for auto-syncing.

```bash
readflow install
readflow install --reconfigure   # Re-pick tracked files
```

**What it creates:**

| Path | Purpose |
|------|---------|
| `.claude/skills/readflow.md` | Skill file for Claude Code agents |
| `.agents/skills/readflow.md` | Skill file for generic AI agents |
| `.readflow/readflow.md` | Readflow-specific skill reference |
| `.readflow/post-commit` | Git hook for auto-uploading tracked files |
| `.readflow/config.json` | Project settings and tracked file list |

The install command scans your project for `.md` files and shows an interactive picker:

```
  Track files for auto-upload (8 found)

  > [x] README.md (always)
    [ ] docs/api.md
    [ ] docs/changelog.md
    [x] CONTRIBUTING.md
```

After installing, enable auto-upload on commit:

```bash
cp .readflow/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

### `config`

Manage CLI settings.

```bash
readflow config --show           # Show current config
readflow config --token <key>    # Save an agent token
readflow config --clear          # Remove token (go anonymous)
```

You can generate an agent token from your [Settings page](https://readflow.aranish.uk/settings).

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
#  > Shared successfully!
#  URL: https://readflow.aranish.uk/s/abc123

# Upload project knowledge for your AI agent
readflow brain
#  > Brain uploaded successfully!
#  URL: https://readflow.aranish.uk/s/def456

# Password-protected doc that expires in 24 hours
readflow share secret.md --password hunter2 --expires 24h

# Update a doc every time you push
readflow share CHANGELOG.md --title "Changelog" --update

# Pipe from another command
gh release view --json body -q .body | readflow share --title "Release Notes"

# Download a doc by searching your account
readflow fetch "changelog" -o CHANGELOG.md

# Browse all docs interactively
readflow fetch

# List everything grouped by project folder
readflow fetch --list
```

## License

MIT

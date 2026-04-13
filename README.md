# Readflow

### The Markdown platform built for agents, developers, and teams who ship fast.

![Readflow Hero](readex/app/icon.svg)

**Readflow** turns Markdown into a shareable, versioned, AI-powered knowledge layer. Write docs in a split-pane editor. Share them with a single click. Let your AI agents publish, update, and manage documentation programmatically through the CLI and API. No friction. No context-switching. Just flow.

---

## Why Readflow?

Most doc tools weren't built for the way modern teams work — with agents writing code, CI pipelines generating changelogs, and LLMs drafting specs. Readflow was.

- **Agents can publish docs.** The CLI and API key system let any script, agent, or pipeline push Markdown to a live, shareable URL in one command.
- **Version everything.** Every edit is tracked. Restore any version instantly. Your docs have the same revision history your code does.
- **AI built in.** Summarize, expand, translate, polish, or chat with your documents — powered by GPT-4o, Claude, and Gemini.
- **Share with control.** Password-protect links. Set expiry timers. Use custom vanity URLs. Gate access without a login wall.
- **Analytics on every doc.** See who's reading, when, and how often — per-document view counts and unique visitor tracking.

---

## Core Features

### Editor
- **Split-pane editing** with real-time Markdown preview
- **Syntax highlighting** via CodeMirror
- **Layout modes** — split, editor-only, or preview-only
- **Starter templates** to skip the blank page
- **Local auto-save** — never lose a draft
- **Mobile-friendly** with responsive layout toggles

### Markdown Rendering
- **GitHub Flavored Markdown** — tables, task lists, strikethrough
- **Math equations** — KaTeX support out of the box
- **Mermaid diagrams** — interactive with pan and zoom controls
- **Code blocks** — syntax-highlighted with the GitHub dark theme
- **Raw HTML** — sanitized and rendered safely
- **Collapsible sections**, SVG support, and more

### Sharing & Access Control
- **One-click sharing** — instant read-only URL
- **Password protection** — SHA-256 hashed, salted
- **Expiring links** — 60 seconds to 30 days
- **Custom vanity URLs** — `/p/your-slug`
- **Embeddable** — drop docs into any page via `/s/{id}/embed`
- **Fork button** — let readers create their own copy
- **Comments** — anonymous or authenticated

### Document Management
- **Dashboard** — Finder (grid) and Explorer (list) views
- **Project folders** — organize docs into named projects
- **Rename and move** — right-click context menu with folder picker modal
- **Drag-and-drop** — move docs between folders, upload `.md` files by dropping
- **Bulk operations** — multi-select with Cmd+click, marquee selection, bulk move/delete
- **Pins** — pin important docs to the top
- **Version history** — full edit timeline with one-click restore
- **Edit page** — update live docs without re-sharing

### AI Assistant
- **Summarize** documents instantly
- **Expand** sections with added detail
- **Fix grammar** and spelling
- **Polish** formatting and structure
- **Generate tables** from raw data
- **Translate** to any language
- **Chat mode** — ask questions about your document
- **Multi-provider** — OpenAI, Anthropic Claude, Google Gemini
- **Rate-limited** — 3 requests/minute per user

### Analytics
- **Per-document view tracking** with unique visitor counts
- **Trend graphs** — SVG area charts with smooth curves
- **Referrer tracking** — see where traffic comes from
- **Admin analytics** — platform-wide stats with period selector (7d/14d/30d), trend indicators, and top documents table

### CLI Tool (`readflow-md`)
```bash
npm i -g readflow-md
```
- **Share from terminal** — `npx readflow share README.md`
- **Fetch documents** — `npx readflow fetch` with interactive search and folder browsing
- **Authenticate via browser** — OAuth flow, no tokens to copy-paste
- **Password & expiry flags** — `--password secret --expires 7d`
- **Update existing docs** — `--update` flag for upserts by slug
- **API key auth** — `rf_` prefixed tokens for headless/agent use
- **Project install** — `readflow install` with interactive file picker for auto-upload tracking
- **Auto-discovery** — finds all `.md` files in your project tree
- **Git hook** — auto-sync tracked files on commit

#### CLI Commands

```bash
readflow share <file>           # Share a markdown file
readflow fetch                  # Browse your docs (interactive picker)
readflow fetch "search term"    # Search by title/folder
readflow fetch <id> -o file.md  # Download by ID
readflow fetch --list           # List all docs grouped by folder
readflow login                  # Authenticate via browser
readflow install                # Set up project tracking & hooks
readflow config --show          # Show current config
```

### Raw Content API
```bash
# Download raw markdown
curl https://readflow.aranish.uk/api/share/{id}/raw

# Download as JSON with metadata
curl https://readflow.aranish.uk/api/share/{id}/raw?format=json

# Password-protected docs
curl https://readflow.aranish.uk/api/share/{id}/raw?password=secret
```

### API & Agentic Integration
- **RESTful API** — create, read, update, delete documents programmatically
- **Bearer token auth** — generate `rf_` API keys from Settings
- **Token-authenticated doc listing** — `GET /api/user/docs/list` with `?q=` search
- **Rate-limited endpoints** — safe for automated workflows
- **Webhook-ready architecture** — plug into CI/CD, chatbots, or agent loops
- **One command to publish** — your agent writes the doc, Readflow hosts it

### Admin Panel
- **User management** — view, search, delete users, toggle plans
- **Document moderation** — edit titles, manage slugs, reassign or remove docs from users
- **Folder visibility** — see user project folders in admin view
- **Drag-and-drop reassignment** — move docs between users
- **Platform analytics** — area charts, trend cards, period filtering, top docs ranking
- **Role-based access** — admin-gated routes via `ADMIN_EMAILS` env var

### Billing & Plans
- **Free tier** — sharing, analytics, custom slugs, passwords, expiry
- **Pro tier** — AI credits (200/month), custom domains, everything in Free
- **Stripe integration** — checkout, customer portal, webhooks
- **Currently unlocked** — all Pro features are free during beta

### Custom Domains
- **Bring your own domain** — CNAME-based setup
- **DNS verification** — automated validation
- **Pro plan feature** — available in beta

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19 |
| Styling | CSS Modules, CSS Variables |
| Editor | CodeMirror (`@uiw/react-codemirror`) |
| Database | Cloudflare D1 (REST Adapter) + local file fallback |
| Auth | NextAuth v5 (Google + GitHub OAuth) |
| AI | OpenAI, Anthropic, Google Generative AI |
| Payments | Stripe |
| CLI | Zero-dependency Node.js (`readflow-md` on npm) |
| Fonts | Abril Fatface + Geist Sans/Mono |
| Deployment | Vercel |

---

## Quick Start

```bash
git clone https://github.com/abhinav-ranish/readflow.git
cd readflow/readex
npm install
npm run dev
```

No database setup required — local file-based storage works out of the box.

## Agentic Quick Start

```bash
# Install the CLI
npm i -g readflow-md

# Authenticate (opens browser)
readflow login

# Share a doc from your agent or pipeline
readflow share ./docs/changelog.md --expires 7d

# Fetch a doc back
readflow fetch "changelog" -o changelog.md

# Or use the API directly
curl -X POST https://readflow.aranish.uk/api/share \
  -H "Authorization: Bearer rf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"content": "# Hello from my agent", "title": "Agent Output"}'
```

---

## Deployment

Ready to go live? Check out the [Deployment Guide](./DEPLOYMENT.md) to set up your Cloudflare D1 database and deploy to Vercel in minutes.

---

## License

MIT

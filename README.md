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
- **Mermaid diagrams** — interactive with pan and zoom
- **Code blocks** — syntax-highlighted with the GitHub dark theme
- **Raw HTML** — sanitized and rendered safely
- **Collapsible sections**, SVG support, and more

### Sharing & Access Control
- **One-click sharing** — instant read-only URL
- **Password protection** — SHA-256 hashed, salted
- **Expiring links** — 60 seconds to 30 days
- **Custom vanity URLs** — `/p/your-slug`
- **Embeddable** — drop docs into any page
- **Fork button** — let readers create their own copy
- **Comments** — anonymous or authenticated

### Document Management
- **Dashboard** — all your docs in one place
- **Folders and pins** — organize and prioritize
- **Bulk operations** — delete and organize at scale
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

### Analytics
- **Per-document view tracking**
- **Unique visitor counts**
- **Trend graphs** — views over time
- **Referrer tracking**

### CLI Tool
```bash
npx readflow share README.md
```
- **Share from terminal** — pipe any `.md` file to a live URL
- **Authenticate via browser** — OAuth flow, no tokens to copy-paste
- **Password & expiry flags** — `--password secret --expiry 7d`
- **Update existing docs** — `--update` flag for upserts
- **API key auth** — `rf_` prefixed tokens for headless/agent use
- **Project skill install** — `readflow install` scaffolds agent guidelines
- **Auto-discovery** — finds Markdown files in your project tree

### API & Agentic Integration
- **RESTful API** — create, read, update, delete documents programmatically
- **Bearer token auth** — generate `rf_` API keys for agents and pipelines
- **Rate-limited endpoints** — safe for automated workflows
- **Webhook-ready architecture** — plug into CI/CD, chatbots, or agent loops
- **One command to publish** — your agent writes the doc, Readflow hosts it

### Admin Panel
- **User management** — view, search, delete users
- **Document moderation** — edit titles, manage slugs, remove content
- **Role-based access** — admin-gated routes

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
| Styling | Vanilla CSS Modules, CSS Variables, Glassmorphism |
| Editor | CodeMirror (`@uiw/react-codemirror`) |
| Database | Cloudflare D1 (REST Adapter) + local file fallback |
| Auth | NextAuth v5 (Google + GitHub OAuth) |
| AI | OpenAI, Anthropic, Google Generative AI |
| Payments | Stripe |
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
# Install the CLI globally
npm i -g readflow

# Authenticate (opens browser)
readflow login

# Share a doc from your agent or pipeline
readflow share ./docs/changelog.md --expiry 7d

# Or use the API directly
curl -X POST https://your-instance.vercel.app/api/share \
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

# Readflow

![Readflow Hero](/readex/public/readex.svg)

**Readflow** is a modern, shareable Markdown editor built for speed and aesthetics. Write your documentation in a clean, split-pane environment and instantly share a read-only link with your team.

## ✨ Features

- **Split-Pane Editing**: Real-time Markdown preview with syntax highlighting.
- **Instant Sharing**: Generate a unique, read-only URL with a single click.
- **Dark Mode Only**: A meticulously crafted dark theme for focused writing.
- **Local Persistence**: Drafts are saved automatically to your browser so you never lose work.
- **Cloud-Ready**: Built-in support for Cloudflare D1 database for production persistence.
- **Mobile Friendly**: Helper toggle for editing on the go.

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Vanilla CSS Modules (Variables & Glassmorphism)
- **Editor**: `@uiw/react-codemirror`
- **Database**: Cloudflare D1 (REST Adapter)
- **Font**: Abril Fatface (Display) + Geist Sans/Mono (Body)

## 🚀 Getting Started

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/abhinav-ranish/readflow.git
    cd readflow
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run locally**:
    ```bash
    npm run dev
    ```
    The app uses a local file-based database for development. No setup required!

## 🌍 Deployment

Ready to go live? Check out the [Deployment Guide](./DEPLOYMENT.md) to set up your Cloudflare D1 database and deploy to Vercel in minutes.

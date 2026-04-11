#!/usr/bin/env node

/**
 * Readflow CLI — Share markdown files instantly
 *
 * npx readflow share README.md
 * npx readflow install              Install project skill files
 * npx readflow config --show        Show config
 * npx readflow login                Authenticate via browser
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const API_BASE = process.env.READFLOW_API_URL || 'https://readflow.aranish.uk';
const CONFIG_DIR = join(homedir(), '.readflow');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// ─── Config ───────────────────────────────────────────���──────

function loadConfig() {
    try {
        if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    } catch {}
    return {};
}

function saveConfig(cfg) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function getToken(opts) {
    return opts?.token || process.env.READFLOW_TOKEN || loadConfig().token || null;
}

// ─── Project config (per-project .readflow/) ─────────────────

function projectConfigPath() {
    return join(process.cwd(), '.readflow', 'config.json');
}

function loadProjectConfig() {
    try {
        const p = projectConfigPath();
        if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
    } catch {}
    return {};
}

function saveProjectConfig(cfg) {
    const dir = join(process.cwd(), '.readflow');
    mkdirSync(dir, { recursive: true });
    writeFileSync(projectConfigPath(), JSON.stringify(cfg, null, 2));
}

// ─── Prompt helper ───────────────────────────────────────────

function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    return new Promise(resolve => {
        rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
    });
}

// ─── Browser auth flow ──────────────────────────────────────

function openBrowser(url) {
    try {
        const platform = process.platform;
        if (platform === 'darwin') execSync(`open "${url}"`);
        else if (platform === 'win32') execSync(`start "" "${url}"`);
        else execSync(`xdg-open "${url}"`);
        return true;
    } catch {
        return false;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function browserLogin() {
    console.log('\n  Starting browser login...\n');

    // Request a code from the server
    let code;
    try {
        const res = await fetch(`${API_BASE}/api/cli/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create' }),
        });
        const data = await res.json();
        code = data.code;
    } catch {
        console.error('  Error: Could not connect to server.');
        return false;
    }

    const authUrl = `${API_BASE}/cli/auth?code=${code}`;

    const opened = openBrowser(authUrl);
    if (opened) {
        console.log(`  Browser opened! Approve the login there.`);
    } else {
        console.log(`  Could not open browser. Visit this URL:`);
    }
    console.log(`  ${authUrl}\n`);
    console.log(`  Code: ${code}\n`);
    console.log('  Waiting for approval...');

    // Poll for approval (max 10 min, every 3s)
    for (let i = 0; i < 200; i++) {
        await sleep(3000);
        try {
            const res = await fetch(`${API_BASE}/api/cli/auth?code=${code}`);
            const data = await res.json();

            if (data.status === 'approved') {
                const cfg = loadConfig();
                saveConfig({ ...cfg, token: data.token, setupDone: true });
                console.log(`\n  ✓ Logged in as ${data.email || 'your account'}`);
                console.log(`  All shares will be linked to your account.\n`);
                return true;
            }

            if (data.status === 'expired') {
                console.log('\n  Code expired. Try again.');
                return false;
            }
        } catch {
            // Network hiccup, keep polling
        }
    }

    console.log('\n  Timed out waiting for approval.');
    return false;
}

// ─── First-run check ────────────────────────────────────────

async function firstRunCheck() {
    const cfg = loadConfig();
    if (cfg.setupDone) return;

    console.log(`\n  Welcome to Readflow CLI!\n`);
    console.log(`  You can share anonymously or log in to post to your account.`);
    console.log(`  Logged-in shares appear in your dashboard and can be edited.`);
    console.log(`  You can change this anytime with: npx readflow login\n`);

    const choice = await ask('  Log in via browser? (y/n): ');

    if (choice.toLowerCase() === 'y') {
        const ok = await browserLogin();
        if (!ok) {
            saveConfig({ setupDone: true });
            console.log(`  Continuing anonymously. Run "npx readflow login" anytime.\n`);
        }
    } else {
        saveConfig({ setupDone: true });
        console.log(`\n  Sharing anonymously. Run "npx readflow login" to log in later.\n`);
    }
}

// ─── Arg parsing ────────────────────────────────────────────

function parseArgs(args) {
    const result = { file: null, title: null, password: null, expires: null, token: null, update: false, help: false };
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') { result.help = true; }
        else if (arg === '--title' || arg === '-t') { result.title = args[++i]; }
        else if (arg === '--password' || arg === '-p') { result.password = args[++i]; }
        else if (arg === '--expires' || arg === '-e') { result.expires = args[++i]; }
        else if (arg === '--token') { result.token = args[++i]; }
        else if (arg === '--update' || arg === '-u') { result.update = true; }
        else if (!result.file) { result.file = arg; }
        i++;
    }
    return result;
}

function parseExpiry(str) {
    if (!str) return undefined;
    const match = str.match(/^(\d+)(h|d|m)$/);
    if (!match) return undefined;
    const num = parseInt(match[1]);
    switch (match[2]) {
        case 'h': return num * 3600;
        case 'd': return num * 86400;
        case 'm': return num * 60;
    }
    return undefined;
}

// ─── Install command ────────────────────────────────────────

function detectProjectName() {
    try {
        const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
        return pkg.name || basename(process.cwd());
    } catch {
        return basename(process.cwd());
    }
}

function findMarkdownFiles() {
    const files = [];
    const ignore = ['node_modules', '.git', '.readflow', 'dist', 'build', '.next'];

    function walk(dir, depth) {
        if (depth > 3) return;
        try {
            for (const entry of readdirSync(dir)) {
                if (ignore.includes(entry)) continue;
                const full = join(dir, entry);
                const stat = statSync(full);
                if (stat.isDirectory()) walk(full, depth + 1);
                else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
                    const rel = full.replace(process.cwd() + '/', '');
                    files.push(rel);
                }
            }
        } catch {}
    }

    walk(process.cwd(), 0);
    return files;
}

async function handleInstall() {
    const projectName = detectProjectName();
    console.log(`\n  Installing Readflow for: ${projectName}\n`);

    const projCfg = loadProjectConfig();

    // Create .readflow dir
    const rfDir = join(process.cwd(), '.readflow');
    mkdirSync(rfDir, { recursive: true });

    // Write CLAUDE.md skill file
    const claudeMd = `# Readflow Commit & Document Guidelines

## Commit Message Format

- First letter MUST be capitalized
- Include project name in scope: \`[${projectName}] Your message\`
- Use present tense: "Add feature" not "Added feature"
- Keep first line under 72 characters

### Examples
- \`[${projectName}] Add user authentication\`
- \`[${projectName}] Fix markdown parsing edge case\`
- \`[${projectName}] Update API documentation\`

## Document Sharing

When README.md is created or updated, upload it to Readflow:
\`\`\`bash
npx readflow share README.md --title "${projectName} README" --update
\`\`\`

## Tracked Files

The following files are automatically synced to Readflow when changed:
${(projCfg.trackedFiles || ['README.md']).map(f => `- ${f}`).join('\n')}

To update tracked files: \`npx readflow install --reconfigure\`
`;

    writeFileSync(join(rfDir, 'CLAUDE.md'), claudeMd);
    console.log('  ✓ Created .readflow/CLAUDE.md (commit guidelines)');

    // Write git hook helper
    const hookScript = `#!/bin/sh
# Readflow post-commit hook — auto-upload tracked files
# Install: cp .readflow/post-commit .git/hooks/post-commit && chmod +x .git/hooks/post-commit

CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD)
CONFIG=".readflow/config.json"

if [ ! -f "$CONFIG" ]; then exit 0; fi

# Read tracked files from config
TRACKED=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG','utf8'));(c.trackedFiles||[]).forEach(f=>console.log(f))}catch{}")

for FILE in $TRACKED; do
    if echo "$CHANGED" | grep -q "^$FILE$"; then
        echo "[readflow] Syncing $FILE..."
        npx readflow share "$FILE" --update 2>/dev/null &
    fi
done
`;

    writeFileSync(join(rfDir, 'post-commit'), hookScript);
    console.log('  ✓ Created .readflow/post-commit (git hook)');

    // Ask about tracked files (skip if --reconfigure or already configured with --no-ask)
    if (!projCfg.askedAboutFiles || process.argv.includes('--reconfigure')) {
        const mdFiles = findMarkdownFiles();
        const tracked = ['README.md'];

        if (mdFiles.length > 1) {
            console.log(`\n  Found ${mdFiles.length} markdown files:\n`);
            mdFiles.forEach((f, i) => {
                const isReadme = f.toLowerCase() === 'readme.md';
                console.log(`  ${isReadme ? '  ✓' : `  ${i + 1}.`} ${f}${isReadme ? ' (always tracked)' : ''}`);
            });

            if (process.stdin.isTTY) {
                const answer = await ask('\n  Track additional files for auto-upload? (y/n): ');

                if (answer.toLowerCase() === 'y') {
                    const otherFiles = mdFiles.filter(f => f.toLowerCase() !== 'readme.md');
                    console.log('');
                    for (const f of otherFiles) {
                        const include = await ask(`  Track ${f}? (y/n): `);
                        if (include.toLowerCase() === 'y') tracked.push(f);
                    }
                }
            }
        }

        projCfg.trackedFiles = tracked;
        projCfg.askedAboutFiles = true;
    }

    // Save project config
    projCfg.projectName = projectName;
    projCfg.installedAt = Date.now();
    saveProjectConfig(projCfg);
    console.log('  ✓ Created .readflow/config.json (project settings)');

    // Re-write CLAUDE.md with final tracked files
    const finalClaudeMd = `# Readflow Commit & Document Guidelines

## Commit Message Format

- First letter MUST be capitalized
- Include project name in scope: \`[${projectName}] Your message\`
- Use present tense: "Add feature" not "Added feature"
- Keep first line under 72 characters

### Examples
- \`[${projectName}] Add user authentication\`
- \`[${projectName}] Fix markdown parsing edge case\`
- \`[${projectName}] Update API documentation\`

## Document Sharing

When README.md is created or updated, upload it to Readflow:
\`\`\`bash
npx readflow share README.md --title "${projectName} README" --update
\`\`\`

## Tracked Files

The following files are automatically synced to Readflow when changed:
${(projCfg.trackedFiles || ['README.md']).map(f => `- ${f}`).join('\n')}

To update tracked files: \`npx readflow install --reconfigure\`
`;
    writeFileSync(join(rfDir, 'CLAUDE.md'), finalClaudeMd);

    console.log(`\n  Setup complete! To enable auto-upload on commit:\n`);
    console.log(`  cp .readflow/post-commit .git/hooks/post-commit`);
    console.log(`  chmod +x .git/hooks/post-commit\n`);
    console.log(`  Add ".readflow/" to your .gitignore if you don't want to share config.\n`);
}

// ─── Config command ──────────────────────────────────���──────

async function handleConfig(args) {
    const cfg = loadConfig();

    if (args.includes('--clear')) {
        saveConfig({ ...cfg, token: undefined, setupDone: true });
        console.log('  ✓ Token cleared. Shares will be anonymous.');
        return;
    }

    if (args.includes('--show')) {
        if (cfg.token) {
            console.log(`  Token: ${cfg.token.slice(0, 7)}...${cfg.token.slice(-4)}`);
            console.log(`  Mode:  Authenticated`);
        } else {
            console.log(`  Token: not set`);
            console.log(`  Mode:  Anonymous`);
        }
        console.log(`  API:   ${API_BASE}`);

        const projCfg = loadProjectConfig();
        if (projCfg.projectName) {
            console.log(`  Project: ${projCfg.projectName}`);
            console.log(`  Tracked: ${(projCfg.trackedFiles || []).join(', ')}`);
        }
        return;
    }

    const tokenIdx = args.indexOf('--token');
    if (tokenIdx !== -1 && args[tokenIdx + 1]) {
        saveConfig({ ...cfg, token: args[tokenIdx + 1], setupDone: true });
        console.log(`  ✓ Token saved. Shares will be linked to your account.`);
        return;
    }

    console.log(`
  readflow config — Manage CLI settings

  USAGE:
    npx readflow config --token <key>    Save agent token
    npx readflow config --show           Show current config
    npx readflow config --clear          Remove token (go anonymous)

  Or log in via browser: npx readflow login
`);
}

// ─── Share command ──────────────────────────────────────────

async function handleShare(args) {
    const opts = parseArgs(args);
    if (opts.help) { printHelp(); process.exit(0); }

    const hasToken = getToken(opts);
    if (!hasToken && !loadConfig().setupDone && process.stdin.isTTY) {
        await firstRunCheck();
    }

    let content;

    if (!opts.file || opts.file === '-') {
        const chunks = [];
        process.stdin.setEncoding('utf8');
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        content = chunks.join('');
        if (!content.trim()) {
            console.error('Error: No content provided via stdin');
            process.exit(1);
        }
    } else {
        try {
            content = readFileSync(opts.file, 'utf8');
        } catch {
            console.error(`Error: Cannot read file "${opts.file}"`);
            process.exit(1);
        }
        if (!opts.title) {
            opts.title = basename(opts.file, '.md');
        }
    }

    // Auto-detect update mode for tracked files
    const projCfg = loadProjectConfig();
    const isTracked = opts.file && projCfg.trackedFiles?.includes(opts.file);
    const shouldUpdate = opts.update || isTracked;

    const body = {
        content,
        title: opts.title || undefined,
        password: opts.password || undefined,
        expiresIn: parseExpiry(opts.expires),
    };

    // If updating, generate a deterministic slug from project name + file path
    // This ensures each file maps to exactly one doc — no title collisions
    if (shouldUpdate && opts.file) {
        const project = projCfg.projectName || basename(process.cwd());
        const fileSlug = opts.file.replace(/[\/\\]/g, '-').replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9-]/g, '');
        body.upsertSlug = `${project}-${fileSlug}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 60);
    }

    const token = getToken(opts);

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/api/share`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error(`Error: ${data.error || `HTTP ${res.status}`}`);
            process.exit(1);
        }

        const data = await res.json();
        const wasUpdated = data.updated;
        console.log(`\n  ✓ ${wasUpdated ? 'Updated' : 'Shared'} successfully!\n`);
        console.log(`  URL: ${data.url}`);
        if (wasUpdated) console.log(`  📝 Existing document updated`);
        if (token) console.log(`  👤 Posted to your account`);
        else console.log(`  👻 Posted anonymously`);
        if (opts.password) console.log(`  🔒 Password-protected`);
        if (opts.expires) console.log(`  ⏱  Expires in ${opts.expires}`);
        console.log('');
    } catch {
        console.error(`Error: Could not connect to ${API_BASE}`);
        process.exit(1);
    }
}

// ─── Help ───────────────────────────────────────────────────

function printHelp() {
    console.log(`
readflow — Share markdown files instantly

COMMANDS:
  share <file>       Share a markdown file
  login              Authenticate via browser
  install            Install project skill files & hooks
  config             Manage settings

SHARE OPTIONS:
  --title, -t <title>     Set document title
  --password, -p <pass>   Password-protect the share
  --expires, -e <time>    Set expiry (e.g., 1h, 24h, 7d)
  --update, -u            Update existing doc with same title (upsert)
  --token <key>           One-time token override
  --help, -h              Show this help

INSTALL OPTIONS:
  --reconfigure           Re-ask about tracked files

EXAMPLES:
  npx readflow share README.md
  npx readflow login
  npx readflow install
  npx readflow share docs/api.md --title "API Reference" --expires 7d

ENVIRONMENT:
  READFLOW_API_URL    Override API base URL
  READFLOW_TOKEN      Agent token override
`);
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];

    if (!cmd || cmd === '--help' || cmd === '-h') {
        printHelp();
        process.exit(0);
    }

    switch (cmd) {
        case 'share':   return handleShare(args.slice(1));
        case 'login':   return browserLogin();
        case 'install': return handleInstall();
        case 'config':  return handleConfig(args.slice(1));
        default:        return handleShare(args); // treat as file
    }
}

main();

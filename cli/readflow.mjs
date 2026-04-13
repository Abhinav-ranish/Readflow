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
import { basename, join } from 'path';
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

// ─── Interactive pickers (zero deps, raw stdin) ────────────

function interactiveCheckbox(items, { preSelected = [], label = 'Select items' } = {}) {
    if (!process.stdin.isTTY) return Promise.resolve(preSelected);

    return new Promise(resolve => {
        const selected = new Set(preSelected);
        let cursor = 0;

        function render() {
            // Move cursor up to overwrite previous render
            if (cursor >= 0) process.stderr.write(`\x1B[${items.length + 2}A`);
            process.stderr.write(`\x1B[J`); // clear below
            process.stderr.write(`  ${label} (space=toggle, a=all, n=none, enter=confirm)\n\n`);
            items.forEach((item, i) => {
                const check = selected.has(item.value) ? '\x1B[36m✓\x1B[0m' : ' ';
                const pointer = i === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
                const dim = item.locked ? ' \x1B[2m(always)\x1B[0m' : '';
                process.stderr.write(`  ${pointer} [${check}] ${item.label}${dim}\n`);
            });
        }

        // Initial spacing
        process.stderr.write('\n'.repeat(items.length + 3));
        render();

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const onKey = (key) => {
            if (key === '\x03') { process.stdin.setRawMode(false); process.exit(0); } // ctrl+c
            if (key === '\r' || key === '\n') { // enter
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onKey);
                process.stderr.write('\n');
                resolve([...selected]);
                return;
            }
            if (key === ' ') { // space = toggle
                const item = items[cursor];
                if (!item.locked) {
                    selected.has(item.value) ? selected.delete(item.value) : selected.add(item.value);
                }
            }
            if (key === 'a') { items.forEach(i => selected.add(i.value)); }
            if (key === 'n') { items.forEach(i => { if (!i.locked) selected.delete(i.value); }); }
            if (key === '\x1B[A' || key === 'k') { cursor = (cursor - 1 + items.length) % items.length; } // up
            if (key === '\x1B[B' || key === 'j') { cursor = (cursor + 1) % items.length; } // down
            render();
        };

        process.stdin.on('data', onKey);
    });
}

function interactiveSelect(items, { label = 'Select', filter = true } = {}) {
    if (!process.stdin.isTTY) return Promise.resolve(null);

    return new Promise(resolve => {
        let cursor = 0;
        let query = '';
        let filtered = items;

        function getFiltered() {
            if (!query) return items;
            const q = query.toLowerCase();
            return items.filter(i => i.label.toLowerCase().includes(q) || (i.detail || '').toLowerCase().includes(q));
        }

        function render() {
            const maxShow = Math.min(filtered.length, 15);
            const totalLines = maxShow + (filter ? 3 : 2);
            process.stderr.write(`\x1B[${totalLines + 1}A\x1B[J`);
            process.stderr.write(`  ${label}\n`);
            if (filter) {
                process.stderr.write(`  \x1B[2mSearch:\x1B[0m ${query}\x1B[K\n`);
            }
            process.stderr.write('\n');
            const start = Math.max(0, cursor - maxShow + 1);
            for (let i = start; i < Math.min(filtered.length, start + maxShow); i++) {
                const item = filtered[i];
                const pointer = i === cursor ? '\x1B[36m❯\x1B[0m' : ' ';
                const detail = item.detail ? ` \x1B[2m${item.detail}\x1B[0m` : '';
                process.stderr.write(`  ${pointer} ${item.label}${detail}\n`);
            }
            if (filtered.length === 0) {
                process.stderr.write(`  \x1B[2mNo matches\x1B[0m\n`);
            }
        }

        // Initial spacing
        const initLines = Math.min(items.length, 15) + (filter ? 3 : 2) + 1;
        process.stderr.write('\n'.repeat(initLines));
        render();

        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const onKey = (key) => {
            if (key === '\x03') { process.stdin.setRawMode(false); process.exit(0); }
            if (key === '\r' || key === '\n') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onKey);
                process.stderr.write('\n');
                resolve(filtered[cursor] || null);
                return;
            }
            if (key === '\x1B[A' || key === 'k' && !filter) { cursor = Math.max(0, cursor - 1); }
            else if (key === '\x1B[B' || key === 'j' && !filter) { cursor = Math.min(filtered.length - 1, cursor + 1); }
            else if (key === '\x7F' || key === '\b') { query = query.slice(0, -1); filtered = getFiltered(); cursor = 0; } // backspace
            else if (key === '\x1B') { /* escape sequences handled above */ }
            else if (key === '\x1B[A') { cursor = Math.max(0, cursor - 1); }
            else if (key === '\x1B[B') { cursor = Math.min(filtered.length - 1, cursor + 1); }
            else if (filter && key.length === 1 && key >= ' ') { query += key; filtered = getFiltered(); cursor = 0; }
            render();
        };

        process.stdin.on('data', onKey);
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

        if (mdFiles.length > 0 && process.stdin.isTTY) {
            const items = mdFiles.map(f => ({
                value: f,
                label: f,
                locked: f.toLowerCase() === 'readme.md',
            }));

            const tracked = await interactiveCheckbox(items, {
                preSelected: mdFiles.filter(f => f.toLowerCase() === 'readme.md'),
                label: `Track files for auto-upload (${mdFiles.length} found)`,
            });

            projCfg.trackedFiles = tracked.length > 0 ? tracked : ['README.md'];
        } else {
            projCfg.trackedFiles = mdFiles.includes('README.md') ? ['README.md'] : mdFiles.slice(0, 1);
        }

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

// ─── Fetch command ─────────────────────────────────────────

function parseFetchArgs(args) {
    const result = { query: null, output: null, password: null, json: false, help: false, list: false };
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') { result.help = true; }
        else if (arg === '--output' || arg === '-o') { result.output = args[++i]; }
        else if (arg === '--password' || arg === '-p') { result.password = args[++i]; }
        else if (arg === '--json') { result.json = true; }
        else if (arg === '--list' || arg === '-l') { result.list = true; }
        else if (!result.query) { result.query = arg; }
        i++;
    }
    return result;
}

function extractDocId(input) {
    if (!input) return null;
    const urlMatch = input.match(/\/s\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    const slugMatch = input.match(/\/p\/([a-zA-Z0-9_-]+)/);
    if (slugMatch) return slugMatch[1];
    return input;
}

function isDirectId(input) {
    // Looks like a direct ID (hash-like) or full URL
    if (!input) return false;
    if (input.includes('/')) return true; // URL
    if (/^[a-f0-9]{6,}$/i.test(input)) return true; // hex hash
    if (/^[a-zA-Z0-9_-]{8,}$/.test(input) && !input.includes(' ')) return true; // ID-like
    return false;
}

async function fetchUserDocs(token, query) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    try {
        const res = await fetch(`${API_BASE}/api/user/docs/list${qs}`, { headers });
        if (res.ok) return await res.json();
    } catch {}
    return null;
}

function fmtDocForPicker(doc) {
    const folder = doc.folder ? `${doc.folder}/` : '';
    const title = doc.title || 'Untitled';
    const date = new Date(doc.createdAt).toLocaleDateString();
    return {
        value: doc.id,
        label: `${folder}${title}`,
        detail: `${date}${doc.slug ? ` · /p/${doc.slug}` : ''}`,
        folder: doc.folder || null,
        title,
    };
}

async function handleFetch(args) {
    const opts = parseFetchArgs(args);

    if (opts.help) {
        console.log(`
  readflow fetch — Download a document from Readflow

  USAGE:
    npx readflow fetch                              Browse your docs (interactive)
    npx readflow fetch <search>                     Search by title/folder name
    npx readflow fetch <id-or-url>                  Fetch by direct ID or URL
    npx readflow fetch <search> -o file.md          Save to file
    npx readflow fetch <id-or-url> -p <password>    Fetch password-protected doc
    npx readflow fetch --list                       List all your docs
    npx readflow fetch <search> --json              Output as JSON with metadata

  SEARCH PATTERNS:
    npx readflow fetch "API docs"                   Search by title
    npx readflow fetch myproject/README              Search by folder/title
    npx readflow fetch myproject                    All docs in a folder

  EXAMPLES:
    npx readflow fetch
    npx readflow fetch "security audit"
    npx readflow fetch abc123 -o README.md
    npx readflow fetch https://readflow.aranish.uk/s/abc123
`);
        process.exit(0);
    }

    const token = getToken(opts);

    // If query looks like a direct ID or URL, go straight to download
    if (opts.query && isDirectId(opts.query)) {
        return downloadDoc(extractDocId(opts.query), opts);
    }

    // Otherwise: search user's docs
    if (!token) {
        if (opts.query) {
            // Maybe it's an ID after all — try it
            return downloadDoc(opts.query, opts);
        }
        console.error('  Error: Log in first to browse your docs: npx readflow login');
        console.error('  Or provide a direct document ID: npx readflow fetch <id>');
        process.exit(1);
    }

    console.log('\n  Fetching your documents...\n');
    const docs = await fetchUserDocs(token, opts.query || null);

    if (!docs) {
        console.error('  Error: Could not fetch documents. Check your connection or token.');
        process.exit(1);
    }

    if (docs.length === 0) {
        if (opts.query) {
            console.log(`  No documents matching "${opts.query}".`);
            // Try as direct ID fallback
            const tryId = extractDocId(opts.query);
            if (tryId) {
                console.log(`  Trying as document ID...\n`);
                return downloadDoc(tryId, opts);
            }
        } else {
            console.log('  No documents found in your account.');
        }
        process.exit(0);
    }

    // --list: just print the table
    if (opts.list) {
        // Group by folder
        const byFolder = {};
        for (const doc of docs) {
            const f = doc.folder || '(unfiled)';
            if (!byFolder[f]) byFolder[f] = [];
            byFolder[f].push(doc);
        }
        for (const [folder, folderDocs] of Object.entries(byFolder).sort()) {
            console.log(`  \x1B[36m${folder}\x1B[0m`);
            for (const doc of folderDocs) {
                const title = (doc.title || 'Untitled').padEnd(40);
                const date = new Date(doc.createdAt).toLocaleDateString();
                const idStr = doc.id.slice(0, 8);
                console.log(`    ${title} \x1B[2m${date}  ${idStr}\x1B[0m`);
            }
            console.log('');
        }
        process.exit(0);
    }

    // If multiple results and TTY, show interactive picker
    if (docs.length > 1 && process.stdin.isTTY) {
        const items = docs.map(fmtDocForPicker);
        const selected = await interactiveSelect(items, {
            label: opts.query ? `Results for "${opts.query}" (${docs.length} docs) — type to filter` : `Your documents (${docs.length}) — type to filter`,
        });
        if (!selected) { console.log('  Cancelled.'); process.exit(0); }
        return downloadDoc(selected.value, opts);
    }

    // Single result or non-TTY: use the first match
    if (docs.length === 1) {
        const doc = docs[0];
        console.log(`  Found: ${doc.folder ? doc.folder + '/' : ''}${doc.title || 'Untitled'}\n`);
        return downloadDoc(doc.id, opts);
    }

    // Non-TTY with multiple results: print list
    console.log(`  Found ${docs.length} documents. Use --list to see all, or be more specific.\n`);
    docs.slice(0, 5).forEach(d => {
        console.log(`    ${d.folder ? d.folder + '/' : ''}${d.title || 'Untitled'}  \x1B[2m(${d.id.slice(0, 8)})\x1B[0m`);
    });
    if (docs.length > 5) console.log(`    ... and ${docs.length - 5} more`);
    console.log('');
    process.exit(0);
}

async function downloadDoc(docId, opts) {
    const params = new URLSearchParams();
    if (opts.json) params.set('format', 'json');
    if (opts.password) params.set('password', opts.password);
    const qs = params.toString();

    const url = `${API_BASE}/api/share/${encodeURIComponent(docId)}/raw${qs ? '?' + qs : ''}`;

    try {
        const res = await fetch(url);

        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            if (data.protected) {
                console.error('  Error: This document is password-protected. Use --password <pass>');
            } else {
                console.error('  Error: Unauthorized');
            }
            process.exit(1);
        }

        if (res.status === 403) {
            console.error('  Error: Incorrect password.');
            process.exit(1);
        }

        if (res.status === 404) {
            console.error(`  Error: Document "${docId}" not found.`);
            process.exit(1);
        }

        if (res.status === 410) {
            console.error('  Error: This document has expired.');
            process.exit(1);
        }

        if (!res.ok) {
            console.error(`  Error: HTTP ${res.status}`);
            process.exit(1);
        }

        const body = await res.text();

        if (opts.output) {
            writeFileSync(opts.output, body);
            const size = Buffer.byteLength(body);
            console.log(`\n  ✓ Saved to ${opts.output} (${size} bytes)\n`);
        } else {
            process.stdout.write(body);
            if (!body.endsWith('\n')) process.stdout.write('\n');
        }
    } catch {
        console.error(`  Error: Could not connect to ${API_BASE}`);
        process.exit(1);
    }
}

// ─── Help ───────────────────────────────────────────────────

function printHelp() {
    console.log(`
readflow — Share markdown files instantly

COMMANDS:
  share <file>       Share a markdown file
  fetch <id-or-url>  Download a document
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

FETCH OPTIONS:
  --output, -o <file>     Save to file instead of stdout
  --password, -p <pass>   Password for protected docs
  --json                  Output as JSON with metadata
  --list, -l              List all docs (no download)
  --help, -h              Show fetch help

INSTALL OPTIONS:
  --reconfigure           Re-ask about tracked files

EXAMPLES:
  npx readflow share README.md
  npx readflow fetch                                      Browse & pick a doc
  npx readflow fetch "API docs"                           Search by name
  npx readflow fetch myproject/README -o README.md        Search folder/title
  npx readflow fetch --list                               List all your docs
  npx readflow fetch abc123                               Direct ID
  npx readflow login
  npx readflow install

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
        case 'fetch':   return handleFetch(args.slice(1));
        case 'login':   return browserLogin();
        case 'install': return handleInstall();
        case 'config':  return handleConfig(args.slice(1));
        default:        return handleShare(args); // treat as file
    }
}

main();

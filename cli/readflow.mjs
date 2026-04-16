#!/usr/bin/env node

/**
 * Readflow CLI — Share markdown files instantly
 *
 * readflow share README.md
 * readflow brain                Upload project knowledge to Readflow
 * readflow install              Install project skill files & hooks
 * readflow config --show        Show config
 * readflow login                Authenticate via browser
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

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
            if (key === '\x1B[A') { cursor = Math.max(0, cursor - 1); }
            else if (key === '\x1B[B') { cursor = Math.min(filtered.length - 1, cursor + 1); }
            else if (key === '\x7F' || key === '\b') { query = query.slice(0, -1); filtered = getFiltered(); cursor = 0; } // backspace
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
    console.log(`  You can change this anytime with: readflow login\n`);

    const choice = await ask('  Log in via browser? (y/n): ');

    if (choice.toLowerCase() === 'y') {
        const ok = await browserLogin();
        if (!ok) {
            saveConfig({ setupDone: true });
            console.log(`  Continuing anonymously. Run "readflow login" anytime.\n`);
        }
    } else {
        saveConfig({ setupDone: true });
        console.log(`\n  Sharing anonymously. Run "readflow login" to log in later.\n`);
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

function getSkillFiles(projectName, trackedFiles) {
    const overview = [
        '---',
        'name: readflow',
        'description: Share documents and upload curated project knowledge to Readflow',
        '---',
        '',
        '# Readflow — ' + projectName,
        '',
        'Readflow lets you share markdown documents and upload curated project knowledge from the CLI.',
        '',
        '## Commands',
        '',
        '| User says | Command |',
        '|-----------|---------|',
        '| "share this", "upload to readflow", "publish readme" | `readflow share <file>` |',
        '| "upload brain", "sync brain", "push knowledge" | `readflow brain` |',
        '| "fetch from readflow", "download doc" | `readflow fetch` |',
        '',
        '## Tracked files (auto-sync on commit)',
        '',
        ...(trackedFiles || ['README.md']).map(f => '- ' + f),
        '',
        '## Other commands',
        '',
        '```bash',
        'readflow login                    # Authenticate via browser',
        'readflow config --show            # Show settings',
        'readflow install --reconfigure    # Re-pick tracked files',
        '```',
        '',
        'See sub-skills for detailed usage: brain/, share/, fetch/.',
    ].join('\n');

    const brain = [
        '---',
        'name: readflow-brain',
        'description: Upload curated project knowledge base to Readflow',
        '---',
        '',
        '# Brain — Upload Project Knowledge',
        '',
        '```bash',
        'readflow brain                    # Scan curated knowledge and upload',
        'readflow brain --dry-run          # Preview included/excluded with reasons',
        'readflow brain --config           # Re-pick which files to include',
        'readflow brain --reset            # Delete brain.json and start fresh',
        '```',
        '',
        '## What it does',
        '',
        'Uploads a **curated project knowledge base** — not the entire repo.',
        '',
        '## Default include rules',
        '',
        '**Knowledge roots** (markdown/text auto-included from these folders):',
        '`docs/`, `brain/`, `notes/`, `knowledge/`, `wiki/`, `design/`, `specs/`, `rfcs/`, `adrs/`',
        '',
        '**Key root docs** (auto-included):',
        'README.md, CHANGELOG.md, ROADMAP.md, CONTRIBUTING.md, ARCHITECTURE.md, PRD*.md, ADR*.md, RFC*.md, SPEC*.md',
        '',
        '**Structured files** (yaml, json, toml, xml):',
        'Only included when inside a knowledge folder. Config files like tsconfig.json, package.json are excluded.',
        '',
        '## Always excluded',
        '',
        '.env*, *.key, *.pem, *.log, lockfiles, binaries, images, build output (dist/, build/, .next/), node_modules/, vendor/, coverage/, .git/, files > 256KB',
        '',
        '## Customization',
        '',
        '| File | Purpose |',
        '|------|---------|',
        '| `.brainignore` | Exclude patterns (gitignore syntax) |',
        '| `.braininclude` | If present, ONLY matching files are considered |',
        '| `.readflow/brain.json` | Saved file selection from interactive picker |',
        '',
        '## When to use',
        '',
        'Run this when the user says: "upload brain", "sync brain", "push knowledge to readflow", "update the brain".',
        '',
        'Always run `--dry-run` first if unsure what will be included.',
    ].join('\n');

    const share = [
        '---',
        'name: readflow-share',
        'description: Share a markdown file via Readflow and get a shareable URL',
        '---',
        '',
        '# Share — Publish Markdown',
        '',
        '```bash',
        'readflow share <file.md>                        # Share a file',
        'readflow share <file.md> --title "Title"        # Set title',
        'readflow share <file.md> --update               # Upsert (update if exists)',
        'readflow share <file.md> -p secret -e 24h       # Protected, 24h expiry',
        'cat notes.md | readflow share -t "Quick Note"   # Pipe from stdin',
        '```',
        '',
        '## Options',
        '',
        '| Flag | Short | Description |',
        '|------|-------|-------------|',
        '| `--title` | `-t` | Set document title (defaults to filename) |',
        '| `--password` | `-p` | Password-protect the share |',
        '| `--expires` | `-e` | Set expiry (1h, 24h, 7d, 30m) |',
        '| `--update` | `-u` | Update existing doc (upsert by slug) |',
        '| `--token` | | One-time token override |',
        '',
        '## When to use',
        '',
        'Run this when the user says: "share this", "upload to readflow", "publish readme", "share this doc".',
    ].join('\n');

    const fetchSkill = [
        '---',
        'name: readflow-fetch',
        'description: Download or browse documents from Readflow',
        '---',
        '',
        '# Fetch — Download Documents',
        '',
        '```bash',
        'readflow fetch                                   # Browse your docs interactively',
        'readflow fetch "search query"                    # Search by title/folder',
        'readflow fetch <id-or-url>                       # Fetch by direct ID or URL',
        'readflow fetch "API docs" -o api.md              # Save to file',
        'readflow fetch --list                            # List all docs grouped by folder',
        'readflow fetch <id> --json                       # Output as JSON with metadata',
        'readflow fetch <id> -p <password>                # Fetch password-protected doc',
        '```',
        '',
        '## Options',
        '',
        '| Flag | Short | Description |',
        '|------|-------|-------------|',
        '| `--output` | `-o` | Save to file instead of stdout |',
        '| `--password` | `-p` | Password for protected documents |',
        '| `--json` | | Output as JSON with metadata |',
        '| `--list` | `-l` | List all docs grouped by folder |',
        '',
        '## When to use',
        '',
        'Run this when the user says: "fetch from readflow", "download doc", "get that doc", "pull from readflow".',
    ].join('\n');

    return { 'SKILL.md': overview, 'brain/SKILL.md': brain, 'share/SKILL.md': share, 'fetch/SKILL.md': fetchSkill };
}

function writeSkillTree(baseDir, files) {
    for (const [relPath, content] of Object.entries(files)) {
        const fullPath = join(baseDir, relPath);
        const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        mkdirSync(parentDir, { recursive: true });
        writeFileSync(fullPath, content);
    }
}

async function handleInstall() {
    const projectName = detectProjectName();
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
  readflow install — Set up Readflow in your project

  USAGE:
    readflow install                Set up skill files, hooks, and config
    readflow install --reconfigure  Re-pick tracked files

  WHAT IT DOES:
    1. Creates agent skill files (4 per root) in:
       - .claude/skills/readflow/     (Claude Code)
       - .agents/skills/readflow/     (Generic agents)
       - .readflow/skills/            (Readflow-specific)
    2. Creates a post-commit git hook for auto-uploading tracked files
    3. Lets you pick which markdown files to auto-sync
    4. Saves project config to .readflow/config.json
`);
        process.exit(0);
    }

    const isAuto = args.includes('--auto');

    if (!isAuto) console.log(`\n  Installing Readflow for: ${projectName}\n`);

    const projCfg = loadProjectConfig();

    // Ask about tracked files (skip if already configured unless --reconfigure)
    if (!projCfg.askedAboutFiles || args.includes('--reconfigure')) {
        const mdFiles = findMarkdownFiles();

        if (mdFiles.length > 0 && process.stdin.isTTY && !isAuto) {
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

    // Generate and write skill files to all agent directories
    const skillFiles = getSkillFiles(projectName, projCfg.trackedFiles);
    const skillRoots = [
        join(process.cwd(), '.claude', 'skills', 'readflow'),
        join(process.cwd(), '.agents', 'skills', 'readflow'),
        join(process.cwd(), '.readflow', 'skills'),
    ];

    for (const root of skillRoots) {
        writeSkillTree(root, skillFiles);
        if (!isAuto) {
            const rel = root.replace(process.cwd() + '/', '');
            console.log(`  ✓ ${rel}/ (${Object.keys(skillFiles).length} skill files)`);
        }
    }

    // Update .claude/skills-lock.json so Claude Code discovers the skills
    const lockPath = join(process.cwd(), 'skills-lock.json');
    try {
        let lock = { version: 1, skills: {} };
        if (existsSync(lockPath)) {
            lock = JSON.parse(readFileSync(lockPath, 'utf8'));
        }
        lock.skills = lock.skills || {};
        const allContent = Object.values(skillFiles).join('\n');
        const computedHash = createHash('sha256').update(allContent).digest('hex');
        lock.skills['readflow'] = {
            source: 'readflow-md',
            sourceType: 'npm',
            computedHash,
        };
        writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
        if (!isAuto) console.log('  ✓ skills-lock.json');
    } catch {}

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
        readflow share "$FILE" --update 2>/dev/null &
    fi
done
`;

    writeFileSync(join(process.cwd(), '.readflow', 'post-commit'), hookScript);

    if (isAuto) {
        console.log(`  [readflow] Skills installed for ${projectName}`);
    } else {
        console.log('  ✓ .readflow/post-commit (git hook)');
        console.log('  ✓ .readflow/config.json');
        console.log(`\n  Setup complete! To enable auto-upload on commit:\n`);
        console.log(`  cp .readflow/post-commit .git/hooks/post-commit`);
        console.log(`  chmod +x .git/hooks/post-commit\n`);
    }
}

// ─── Brain command ──────────────────────────────────────────

// Knowledge roots — folders where brain content lives by default
const BRAIN_ROOTS = ['docs', 'brain', 'notes', 'knowledge', 'wiki', 'design', 'specs', 'rfcs', 'adrs'];

// Root-level files always considered knowledge
const BRAIN_ROOT_FILES = [
    'README.md', 'CHANGELOG.md', 'ROADMAP.md', 'CONTRIBUTING.md',
    'ARCHITECTURE.md', 'DESIGN.md', 'TODO.md', 'DECISIONS.md',
];

// Patterns for root-level knowledge files (case-insensitive match)
const BRAIN_ROOT_PATTERNS = [
    /^prd[_-]?/i, /^adr[_-]?\d/i, /^rfc[_-]?\d/i, /^spec[_-]?/i,
    /^design[_-]?/i, /^proposal[_-]?/i, /^plan[_-]?/i,
];

// Extensions that count as knowledge (markdown/text)
const KNOWLEDGE_EXTENSIONS = ['.md', '.mdx', '.txt', '.rst', '.adoc'];

// Structured formats — only included inside knowledge roots or explicitly
const STRUCTURED_EXTENSIONS = ['.yaml', '.yml', '.json', '.toml', '.xml', '.graphql', '.gql', '.proto', '.prisma'];

// Hard deny — never include regardless of location
const HARD_DENY_DIRS = [
    'node_modules', '.git', '.readflow', 'dist', 'build', '.next', '.vercel',
    '.turbo', '__pycache__', '.cache', 'coverage', '.nyc_output', '.obsidian',
    'vendor', '.gradle', 'target', '.terraform', '.serverless',
];

const HARD_DENY_FILES = [
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
    'composer.lock', 'Gemfile.lock', 'poetry.lock', 'Cargo.lock',
    'go.sum', 'shrinkwrap.json',
];

const HARD_DENY_EXTENSIONS = [
    '.env', '.key', '.pem', '.p12', '.pfx', '.crt', '.cert',
    '.log', '.pid', '.sock', '.lock',
    '.min.js', '.min.css', '.map',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
    '.wasm', '.so', '.dylib', '.dll', '.exe', '.bin',
    '.db', '.sqlite', '.sqlite3',
];

function loadIgnoreFile(filename) {
    const patterns = [];
    try {
        const raw = readFileSync(join(process.cwd(), filename), 'utf8');
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            patterns.push(trimmed);
        }
    } catch {}
    return patterns;
}

function matchesPatterns(relPath, patterns) {
    for (const p of patterns) {
        const pat = p.endsWith('/') ? p.slice(0, -1) : p;
        if (relPath === pat) return true;
        if (relPath.startsWith(pat + '/')) return true;
        const parts = relPath.split('/');
        if (parts.some(part => part === pat)) return true;
        if (pat.startsWith('*.') && relPath.endsWith(pat.slice(1))) return true;
        if (pat.endsWith('/**') && relPath.startsWith(pat.slice(0, -3) + '/')) return true;
        if (pat.startsWith('**/') && relPath.endsWith(pat.slice(3))) return true;
        if (pat.includes('*')) {
            const regex = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*\*/g, '@@').replace(/\*/g, '[^/]*').replace(/@@/g, '.*') + '$');
            if (regex.test(relPath)) return true;
        }
    }
    return false;
}

function isInKnowledgeRoot(relPath) {
    const topDir = relPath.split('/')[0];
    return BRAIN_ROOTS.includes(topDir.toLowerCase());
}

function isKnowledgeRootFile(filename) {
    if (BRAIN_ROOT_FILES.some(f => f.toLowerCase() === filename.toLowerCase())) return true;
    if (BRAIN_ROOT_PATTERNS.some(p => p.test(filename))) return true;
    return false;
}

function scoreBrainFile(relPath, entry, isInRoot) {
    const ext = '.' + (entry.split('.').pop() || '').toLowerCase();
    const isMarkdown = KNOWLEDGE_EXTENSIONS.includes(ext);
    const isStructured = STRUCTURED_EXTENSIONS.includes(ext);

    // Markdown in knowledge roots → highest
    if (isMarkdown && isInRoot) return { score: 10, reason: 'markdown in knowledge folder' };

    // Key root docs
    if (isKnowledgeRootFile(entry) && !relPath.includes('/')) return { score: 9, reason: 'key project doc' };

    // Markdown anywhere (not in denied paths)
    if (isMarkdown) return { score: 7, reason: 'markdown file' };

    // Structured data inside knowledge roots
    if (isStructured && isInRoot) return { score: 5, reason: 'structured data in knowledge folder' };

    // Structured data at root level — low signal, skip by default
    if (isStructured && !isInRoot) return { score: 0, reason: 'config/structured file outside knowledge folder' };

    return { score: 0, reason: 'not a knowledge file' };
}

function findBrainFiles() {
    const gitignorePatterns = loadIgnoreFile('.gitignore');
    const brainIgnorePatterns = loadIgnoreFile('.brainignore');
    const brainIncludePatterns = loadIgnoreFile('.braininclude');
    const hasBrainInclude = brainIncludePatterns.length > 0;

    const included = [];
    const excluded = [];

    function walk(dir, depth) {
        if (depth > 5) return;
        try {
            for (const entry of readdirSync(dir)) {
                if (HARD_DENY_DIRS.includes(entry)) continue;
                if (entry.startsWith('.') && entry !== '.') continue;

                const full = join(dir, entry);
                const rel = full.replace(process.cwd() + '/', '');

                if (matchesPatterns(rel, gitignorePatterns)) continue;
                if (matchesPatterns(rel, brainIgnorePatterns)) {
                    excluded.push({ path: rel, reason: 'matched .brainignore' });
                    continue;
                }

                let stat;
                try { stat = statSync(full); } catch { continue; }

                if (stat.isDirectory()) {
                    walk(full, depth + 1);
                    continue;
                }

                // Hard deny files
                if (HARD_DENY_FILES.includes(entry)) {
                    excluded.push({ path: rel, reason: 'denied file' });
                    continue;
                }
                if (HARD_DENY_EXTENSIONS.some(ext => entry.toLowerCase().endsWith(ext))) {
                    excluded.push({ path: rel, reason: 'denied extension' });
                    continue;
                }
                if (entry.startsWith('.env')) {
                    excluded.push({ path: rel, reason: 'env/secrets file' });
                    continue;
                }

                // Size limit
                if (stat.size > 256000) {
                    excluded.push({ path: rel, reason: `too large (${formatBytes(stat.size)})` });
                    continue;
                }
                if (stat.size === 0) continue;

                // If .braininclude exists, only include matching files
                if (hasBrainInclude && !matchesPatterns(rel, brainIncludePatterns)) {
                    excluded.push({ path: rel, reason: 'not in .braininclude' });
                    continue;
                }

                const inKnowledgeRoot = isInKnowledgeRoot(rel);
                const { score, reason } = scoreBrainFile(rel, entry, inKnowledgeRoot);

                if (score >= 5) {
                    included.push({ path: rel, size: stat.size, score, reason });
                } else {
                    excluded.push({ path: rel, reason });
                }
            }
        } catch {}
    }

    walk(process.cwd(), 0);

    // Sort: highest score first, then alphabetical
    included.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

    return { included, excluded };
}

function loadBrainConfig() {
    try {
        const p = join(process.cwd(), '.readflow', 'brain.json');
        if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
    } catch {}
    return null;
}

function saveBrainConfig(cfg) {
    const dir = join(process.cwd(), '.readflow');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'brain.json'), JSON.stringify(cfg, null, 2));
}

function parseBrainArgs(args) {
    const result = { dryRun: false, config: false, help: false, reset: false };
    for (const arg of args) {
        if (arg === '--help' || arg === '-h') result.help = true;
        else if (arg === '--dry-run' || arg === '-n') result.dryRun = true;
        else if (arg === '--config' || arg === '-c') result.config = true;
        else if (arg === '--reset') result.reset = true;
    }
    return result;
}

async function handleBrain(args) {
    const opts = parseBrainArgs(args);

    if (opts.help) {
        console.log(`
  readflow brain — Upload curated project knowledge to Readflow

  Collects knowledge files from approved documentation folders and key
  project docs, while excluding code, secrets, build output, logs, and
  low-signal config files. This is a curated brain, not a repo scrape.

  USAGE:
    readflow brain                  Scan, review, and upload
    readflow brain --dry-run, -n    Preview included/excluded with reasons
    readflow brain --config, -c     Re-pick which files to include
    readflow brain --reset          Delete brain.json and start fresh

  DEFAULT BEHAVIOR:
    Knowledge roots (auto-included):
      docs/, brain/, notes/, knowledge/, wiki/, design/, specs/, rfcs/, adrs/

    Root docs (auto-included):
      README.md, CHANGELOG.md, ROADMAP.md, CONTRIBUTING.md, ARCHITECTURE.md,
      PRD*.md, ADR*.md, RFC*.md, SPEC*.md

    Structured files (yaml, json, toml, xml):
      Only included when inside a knowledge folder.
      Config files like tsconfig.json, package.json are excluded.

  IGNORE FILES:
    .brainignore    Exclude patterns (like .gitignore syntax)
    .braininclude   If present, ONLY these patterns are considered

  HARD EXCLUDES (always):
    .env*, *.key, *.pem, *.log, lockfiles, binaries, images,
    node_modules, dist, build, .git, coverage, vendor, files > 256KB
`);
        process.exit(0);
    }

    const token = getToken();
    if (!token) {
        console.error('  Error: Log in first to upload brain: readflow login');
        process.exit(1);
    }

    const projectName = detectProjectName();

    // Reset if requested
    if (opts.reset) {
        const p = join(process.cwd(), '.readflow', 'brain.json');
        if (existsSync(p)) {
            const { unlinkSync } = await import('fs');
            unlinkSync(p);
            console.log('  ✓ Deleted brain.json. Run `readflow brain` to start fresh.');
        } else {
            console.log('  No brain.json found.');
        }
        process.exit(0);
    }

    console.log(`\n  Scanning project: ${projectName}\n`);

    const { included, excluded } = findBrainFiles();

    if (included.length === 0) {
        console.log('  No knowledge files found.');
        console.log('  Create a docs/ folder with markdown files, or add a .braininclude file.');
        if (excluded.length > 0) {
            console.log(`\n  ${excluded.length} files were excluded. Run with --dry-run to see why.`);
        }
        process.exit(0);
    }

    // Load or create brain config
    let brainCfg = loadBrainConfig();
    const needsConfigure = !brainCfg || opts.config;

    if (needsConfigure) {
        // Show what we found
        console.log(`  \x1B[36mIncluded\x1B[0m (${included.length} files):\n`);
        for (const f of included) {
            const signal = f.score >= 7 ? '\x1B[32m●\x1B[0m' : '\x1B[33m○\x1B[0m';
            console.log(`    ${signal} ${f.path}  \x1B[2m${formatBytes(f.size)} — ${f.reason}\x1B[0m`);
        }

        if (opts.dryRun && excluded.length > 0) {
            console.log(`\n  \x1B[2mExcluded\x1B[0m (${excluded.length} files):\n`);
            for (const f of excluded.slice(0, 30)) {
                console.log(`    \x1B[2m✗ ${f.path} — ${f.reason}\x1B[0m`);
            }
            if (excluded.length > 30) {
                console.log(`    \x1B[2m... and ${excluded.length - 30} more\x1B[0m`);
            }
        }

        // Interactive selection (pre-select high-signal files)
        if (process.stdin.isTTY && !opts.dryRun) {
            console.log('');
            const items = included.map(f => ({
                value: f.path,
                label: f.path,
                detail: `${formatBytes(f.size)} — ${f.reason}`,
            }));

            const preSelected = included.filter(f => f.score >= 5).map(f => f.path);

            const selected = await interactiveCheckbox(items, {
                preSelected,
                label: `Confirm brain files (${included.length} candidates, ${preSelected.length} pre-selected)`,
            });

            brainCfg = {
                projectName,
                roots: BRAIN_ROOTS.filter(r => {
                    try { return statSync(join(process.cwd(), r)).isDirectory(); } catch { return false; }
                }),
                files: selected,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        } else if (!opts.dryRun) {
            // Non-TTY: include only high-signal files
            brainCfg = {
                projectName,
                roots: BRAIN_ROOTS.filter(r => {
                    try { return statSync(join(process.cwd(), r)).isDirectory(); } catch { return false; }
                }),
                files: included.filter(f => f.score >= 5).map(f => f.path),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }

        if (opts.dryRun) {
            const total = included.reduce((sum, f) => sum + f.size, 0);
            console.log(`\n  Total: ${formatBytes(total)} across ${included.length} files`);
            console.log('  --dry-run: No upload performed.');
            process.exit(0);
        }

        saveBrainConfig(brainCfg);
        console.log(`\n  ✓ Saved brain.json (${brainCfg.files.length} files)`);
        console.log(`  Edit .readflow/brain.json to fine-tune, or ask your agent to configure it.\n`);
    }

    if (opts.dryRun) {
        // Show current config
        console.log(`  Current brain.json: ${brainCfg.files.length} files`);
        for (const f of brainCfg.files) console.log(`    ${f}`);
        console.log('\n  --dry-run: No upload performed.');
        process.exit(0);
    }

    // Resolve final file list — verify files still exist
    const filesToUpload = brainCfg.files.filter(f => {
        try { statSync(join(process.cwd(), f)); return true; } catch { return false; }
    });

    if (filesToUpload.length === 0) {
        console.log('  No files to upload. Run `readflow brain --config` to re-select.');
        process.exit(0);
    }

    // Show summary
    let totalSize = 0;
    console.log(`  Brain contents (${filesToUpload.length} files):\n`);
    for (const f of filesToUpload) {
        try {
            const sz = statSync(join(process.cwd(), f)).size;
            totalSize += sz;
            console.log(`    ${f}  \x1B[2m${formatBytes(sz)}\x1B[0m`);
        } catch {
            console.log(`    ${f}  \x1B[2m(missing)\x1B[0m`);
        }
    }
    console.log(`\n  Total: ${formatBytes(totalSize)}\n`);

    // Build combined document with metadata
    const sections = [];
    sections.push(`# ${projectName} — Project Brain\n`);
    sections.push(`> Curated knowledge base. ${filesToUpload.length} files, ${formatBytes(totalSize)} total.`);
    sections.push(`> Generated: ${new Date().toISOString()}\n`);
    sections.push(`---\n`);

    // Table of contents
    sections.push(`## Contents\n`);
    for (const f of filesToUpload) {
        const anchor = f.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        sections.push(`- [${f}](#${anchor})`);
    }
    sections.push('\n---\n');

    for (const f of filesToUpload) {
        try {
            const content = readFileSync(join(process.cwd(), f), 'utf8');
            const ext = f.split('.').pop() || '';
            sections.push(`## ${f}\n`);
            sections.push(`> Source: \`${f}\` | Type: ${ext} | Size: ${formatBytes(Buffer.byteLength(content))}\n`);
            if (f.endsWith('.md') || f.endsWith('.mdx')) {
                sections.push(content);
            } else {
                sections.push('```' + ext + '\n' + content + '\n```');
            }
            sections.push('\n---\n');
        } catch {
            sections.push(`## ${f}\n\n*File could not be read.*\n\n---\n`);
        }
    }

    const brainDoc = sections.join('\n');

    // Upload as upsert
    const slug = `${projectName}-brain`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 60);

    console.log('  Uploading brain...\n');

    try {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        const res = await fetch(`${API_BASE}/api/share`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                content: brainDoc,
                title: `${projectName} Brain`,
                upsertSlug: slug,
            }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error(`  Error: ${data.error || `HTTP ${res.status}`}`);
            process.exit(1);
        }

        const data = await res.json();
        console.log(`  ✓ Brain ${data.updated ? 'updated' : 'uploaded'} successfully!`);
        console.log(`  URL: ${data.url}`);
        console.log(`  Slug: /p/${slug}`);

        // Auto-create or find matching project, then link the doc to it
        try {
            // List existing projects and find one matching this brain name
            const projListRes = await fetch(`${API_BASE}/api/projects`, { headers });
            const projects = projListRes.ok ? await projListRes.json() : [];
            let projectId = null;
            const brainTitle = `${projectName} Brain`;
            for (const p of projects) {
                if (p.name === projectName || p.name === brainTitle) {
                    projectId = p.id;
                    break;
                }
            }
            // Create project if none found
            if (!projectId) {
                const createRes = await fetch(`${API_BASE}/api/projects`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: projectName }),
                });
                if (createRes.ok) {
                    const proj = await createRes.json();
                    projectId = proj.id;
                    console.log(`  ✓ Created project "${projectName}"`);
                }
            }
            // Link brain doc to project
            if (projectId && data.id) {
                const linkRes = await fetch(`${API_BASE}/api/projects/${projectId}/docs`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ docId: data.id }),
                });
                if (linkRes.ok) {
                    console.log(`  ✓ Linked to project "${projectName}"`);
                }
            }
        } catch {
            // Non-fatal — brain was uploaded, just couldn't link to project
        }

        console.log('');
        brainCfg.lastUpload = Date.now();
        brainCfg.url = data.url;
        saveBrainConfig(brainCfg);
    } catch {
        console.error(`  Error: Could not connect to ${API_BASE}`);
        process.exit(1);
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ─── Config command ──────────────────────────────────���──────

async function handleConfig(args) {
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
  readflow config — Manage CLI settings

  USAGE:
    readflow config --show           Show current settings
    readflow config --token <key>    Save authentication token
    readflow config --clear          Clear token (share anonymously)
    readflow config --help           Show this help
`);
        process.exit(0);
    }

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
    readflow config --token <key>    Save agent token
    readflow config --show           Show current config
    readflow config --clear          Remove token (go anonymous)

  Or log in via browser: readflow login
`);
}

// ─── Share command ──────────────────────────────────────────

async function handleShare(args) {
    const opts = parseArgs(args);
    if (opts.help) {
        console.log(`
  readflow share — Share a markdown file

  USAGE:
    readflow share <file>                   Share a file
    readflow share <file> --update          Upsert (update if exists)
    cat file.md | readflow share            Pipe from stdin

  OPTIONS:
    --title, -t <title>     Set document title (defaults to filename)
    --password, -p <pass>   Password-protect the share
    --expires, -e <time>    Set expiry (e.g., 1h, 24h, 7d, 30m)
    --update, -u            Update existing doc (upsert by slug)
    --token <key>           One-time token override
    --help, -h              Show this help

  EXAMPLES:
    readflow share README.md
    readflow share docs/api.md -t "API Reference" --update
    readflow share notes.md -p mysecret -e 7d
    echo "# Hello" | readflow share -t "Quick Note"
`);
        process.exit(0);
    }

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
    readflow fetch                              Browse your docs (interactive)
    readflow fetch <search>                     Search by title/folder name
    readflow fetch <id-or-url>                  Fetch by direct ID or URL
    readflow fetch <search> -o file.md          Save to file
    readflow fetch <id-or-url> -p <password>    Fetch password-protected doc
    readflow fetch --list                       List all your docs
    readflow fetch <search> --json              Output as JSON with metadata

  SEARCH PATTERNS:
    readflow fetch "API docs"                   Search by title
    readflow fetch myproject/README              Search by folder/title
    readflow fetch myproject                    All docs in a folder

  EXAMPLES:
    readflow fetch
    readflow fetch "security audit"
    readflow fetch abc123 -o README.md
    readflow fetch https://readflow.aranish.uk/s/abc123
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
        console.error('  Error: Log in first to browse your docs: readflow login');
        console.error('  Or provide a direct document ID: readflow fetch <id>');
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
readflow — Share markdown files and project knowledge instantly

COMMANDS:
  share <file>       Share a markdown file (or pipe from stdin)
  brain              Upload project knowledge base to Readflow
  fetch [query]      Download a document (interactive or by ID/URL)
  login              Authenticate via browser
  install            Install agent skill files & git hooks
  config             Manage CLI settings

Run any command with --help for detailed usage.

SHARE:
  readflow share README.md                            Share a file
  readflow share README.md -t "My Docs" --update     Upsert by title
  readflow share README.md -p secret -e 24h          Protected, 24h expiry
  cat notes.md | readflow share                      Pipe from stdin

BRAIN:
  readflow brain                                      Scan curated knowledge & upload
  readflow brain --dry-run                            Preview included/excluded with reasons
  readflow brain --config                             Re-pick files to include

FETCH:
  readflow fetch                                      Browse your docs
  readflow fetch "API docs"                           Search by name
  readflow fetch abc123 -o README.md                  Download by ID
  readflow fetch --list                               List all docs

OTHER:
  readflow login                                      Browser auth
  readflow install                                    Set up project
  readflow config --show                              View settings

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
        case 'brain':   return handleBrain(args.slice(1));
        case 'fetch':   return handleFetch(args.slice(1));
        case 'login':   return browserLogin();
        case 'install': return handleInstall();
        case 'config':  return handleConfig(args.slice(1));
        default:        return handleShare(args); // treat as file
    }
}

main();

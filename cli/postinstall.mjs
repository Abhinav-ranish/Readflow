#!/usr/bin/env node

/**
 * Postinstall script — writes Readflow skill files to the project root.
 * Uses INIT_CWD (set by npm) to find where `npm install` was run.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, basename } from 'path';

const projectDir = process.env.INIT_CWD;
if (!projectDir) process.exit(0);

// Don't run inside node_modules or global installs
if (projectDir.includes('node_modules')) process.exit(0);

function detectProjectName() {
    try {
        const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
        return pkg.name || basename(projectDir);
    } catch {
        return basename(projectDir);
    }
}

const projectName = detectProjectName();

const files = {
    'SKILL.md': `---
name: readflow
description: Share documents and upload curated project knowledge to Readflow
---

# Readflow — ${projectName}

Readflow lets you share markdown documents and upload curated project knowledge from the CLI.

## Commands

| User says | Command |
|-----------|---------|
| "share this", "upload to readflow", "publish readme" | \`readflow share <file>\` |
| "upload brain", "sync brain", "push knowledge" | \`readflow brain\` |
| "fetch from readflow", "download doc" | \`readflow fetch\` |

## Other commands

\`\`\`bash
readflow login                    # Authenticate via browser
readflow config --show            # Show settings
readflow install --reconfigure    # Re-pick tracked files
\`\`\`

See sub-skills for detailed usage: brain/, share/, fetch/.
`,

    'brain/SKILL.md': `---
name: readflow-brain
description: Upload curated project knowledge base to Readflow
---

# Brain — Upload Project Knowledge

\`\`\`bash
readflow brain                    # Scan curated knowledge and upload
readflow brain --dry-run          # Preview included/excluded with reasons
readflow brain --config           # Re-pick which files to include
\`\`\`

Uploads a **curated project knowledge base** — not the entire repo.

**Knowledge roots** (auto-included): \`docs/\`, \`brain/\`, \`notes/\`, \`knowledge/\`, \`wiki/\`, \`design/\`, \`specs/\`
**Key root docs** (auto-included): README.md, CHANGELOG.md, ROADMAP.md, ADR*.md, PRD*.md
**Structured files** (yaml, json, toml): Only inside knowledge folders. Config files excluded.
**Always excluded:** .env*, secrets, keys, logs, lockfiles, binaries, images, build output, node_modules

**Customization:** \`.brainignore\`, \`.braininclude\`, \`.readflow/brain.json\`

Run when user says: "upload brain", "sync brain", "push knowledge to readflow".
`,

    'share/SKILL.md': `---
name: readflow-share
description: Share a markdown file via Readflow and get a shareable URL
---

# Share — Publish Markdown

\`\`\`bash
readflow share <file.md> --title "Title" --update
readflow share <file.md> -p secret -e 24h
cat notes.md | readflow share -t "Quick Note"
\`\`\`

| Flag | Short | Description |
|------|-------|-------------|
| \`--title\` | \`-t\` | Set document title |
| \`--password\` | \`-p\` | Password-protect |
| \`--expires\` | \`-e\` | Set expiry (1h, 24h, 7d) |
| \`--update\` | \`-u\` | Upsert by slug |

Run when user says: "share this", "upload to readflow", "publish readme".
`,

    'fetch/SKILL.md': `---
name: readflow-fetch
description: Download or browse documents from Readflow
---

# Fetch — Download Documents

\`\`\`bash
readflow fetch                    # Browse interactively
readflow fetch "search query"     # Search by title
readflow fetch <id> -o file.md    # Save to file
readflow fetch --list             # List all docs
\`\`\`

| Flag | Short | Description |
|------|-------|-------------|
| \`--output\` | \`-o\` | Save to file |
| \`--password\` | \`-p\` | Protected docs |
| \`--json\` | | JSON with metadata |
| \`--list\` | \`-l\` | List all docs |

Run when user says: "fetch from readflow", "download doc", "pull from readflow".
`,
};

const roots = [
    join(projectDir, '.claude', 'skills', 'readflow'),
    join(projectDir, '.agents', 'skills', 'readflow'),
    join(projectDir, '.readflow', 'skills'),
];

let wrote = 0;
for (const root of roots) {
    try {
        for (const [relPath, content] of Object.entries(files)) {
            const fullPath = join(root, relPath);
            const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
            mkdirSync(parentDir, { recursive: true });
            writeFileSync(fullPath, content);
        }
        wrote++;
    } catch {}
}

// Update .claude/skills-lock.json so Claude Code discovers the skills
const lockPath = join(projectDir, 'skills-lock.json');
try {
    let lock = { version: 1, skills: {} };
    if (existsSync(lockPath)) {
        lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    }
    lock.skills = lock.skills || {};
    const allContent = Object.values(files).join('\n');
    const computedHash = createHash('sha256').update(allContent).digest('hex');
    lock.skills['readflow'] = {
        source: 'readflow-md',
        sourceType: 'npm',
        computedHash,
    };
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    wrote++;
} catch {}

if (wrote > 0) {
    console.log(`  [readflow] Skills installed for ${projectName} (${Object.keys(files).length} skill files)`);
}

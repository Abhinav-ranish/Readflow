#!/usr/bin/env node

/**
 * Readflow CLI — Share markdown files instantly
 * Usage: npx readflow share README.md
 *        npx readflow share README.md --title "My Docs"
 *        npx readflow share README.md --password secret
 *        npx readflow share README.md --expires 24h
 *        echo "# Hello" | npx readflow share -
 */

import { readFileSync } from 'fs';
import { basename } from 'path';

const API_BASE = process.env.READFLOW_API_URL || 'https://readflow.aranish.uk';

function parseArgs(args) {
    const result = { file: null, title: null, password: null, expires: null, help: false };
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') { result.help = true; }
        else if (arg === '--title' || arg === '-t') { result.title = args[++i]; }
        else if (arg === '--password' || arg === '-p') { result.password = args[++i]; }
        else if (arg === '--expires' || arg === '-e') { result.expires = args[++i]; }
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

function printHelp() {
    console.log(`
readflow — Share markdown files instantly

USAGE:
  npx readflow share <file>       Share a markdown file
  npx readflow share -            Read from stdin
  cat file.md | npx readflow share -

OPTIONS:
  --title, -t <title>     Set document title
  --password, -p <pass>   Password-protect the share
  --expires, -e <time>    Set expiry (e.g., 1h, 24h, 7d)
  --help, -h              Show this help

EXAMPLES:
  npx readflow share README.md
  npx readflow share docs/api.md --title "API Reference" --expires 7d
  echo "# Quick note" | npx readflow share - --title "Note"

ENVIRONMENT:
  READFLOW_API_URL    Override API base URL (default: https://readflow.aranish.uk)
`);
}

async function main() {
    const args = process.argv.slice(2);

    // Handle subcommand
    if (args[0] === 'share') {
        args.shift();
    } else if (args[0] !== '-' && !args[0]?.startsWith('-') && args[0]) {
        // Treat first arg as file if no subcommand
    } else if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printHelp();
        process.exit(0);
    }

    const opts = parseArgs(args);
    if (opts.help) { printHelp(); process.exit(0); }

    let content;

    if (!opts.file || opts.file === '-') {
        // Read from stdin
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
        } catch (e) {
            console.error(`Error: Cannot read file "${opts.file}"`);
            process.exit(1);
        }
        // Default title from filename
        if (!opts.title) {
            opts.title = basename(opts.file, '.md');
        }
    }

    const body = {
        content,
        title: opts.title || undefined,
        password: opts.password || undefined,
        expiresIn: parseExpiry(opts.expires),
    };

    try {
        const res = await fetch(`${API_BASE}/api/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error(`Error: ${data.error || `HTTP ${res.status}`}`);
            process.exit(1);
        }

        const data = await res.json();
        console.log(`\n  ✓ Shared successfully!\n`);
        console.log(`  URL: ${data.url}`);
        if (opts.password) console.log(`  🔒 Password-protected`);
        if (opts.expires) console.log(`  ⏱  Expires in ${opts.expires}`);
        console.log('');
    } catch (e) {
        console.error(`Error: Could not connect to ${API_BASE}`);
        process.exit(1);
    }
}

main();

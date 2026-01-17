import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

// Interface for the DB adapter
interface DBAdapter {
    saveReadme(content: string, ip?: string): Promise<string>;
    getReadme(id: string): Promise<string | null>;
    checkRateLimit(ip: string): Promise<boolean>;
}

// --- 1. Local Adapter (Development) ---
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    }
}

function readStore(): Record<string, string> {
    try {
        ensureDataDir();
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("DB Read Error", e);
        return {};
    }
}

function writeStore(data: Record<string, string>) {
    try {
        ensureDataDir();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("DB Write Error", e);
    }
}

// In-memory fallback for environments without write access (Vercel without D1 configured)
const memoryStore = new Map<string, any>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 25; // Posts per hour

const localAdapter: DBAdapter = {
    async checkRateLimit(ip: string): Promise<boolean> {
        // Simple in-memory rate limit for dev
        return true;
    },

    async saveReadme(content: string, ip?: string): Promise<string> {
        const id = nanoid(10);
        const data = { content, ip, createdAt: Date.now() };

        // Try file system if in dev, else memory
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            store[id] = JSON.stringify(data);
            writeStore(store);
        } else {
            memoryStore.set(id, data);
            console.warn("Using In-Memory Store. Data will be lost on restart. Configure Cloudflare D1 for persistence.");
        }

        return id;
    },

    async getReadme(id: string): Promise<string | null> {
        let entry: any = null;
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            entry = store[id] ? JSON.parse(store[id]) : null;
        } else {
            entry = memoryStore.get(id);
        }
        return entry ? entry.content || entry : null; // Handle both old string format and new obj format
    }
};

// --- 2. Cloudflare D1 Adapter (Production via REST) ---
// Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID = process.env.CLOUDFLARE_DATABASE_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function queryD1(sql: string, params: any[] = []) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sql,
            params
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`D1 API Error: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    if (!json.success) {
        throw new Error(`D1 Query Failed: ${JSON.stringify(json.errors)}`);
    }

    return json.result[0]?.results || [];
}

const cloudflareAdapter: DBAdapter = {
    async checkRateLimit(ip: string): Promise<boolean> {
        const check = async () => {
            // Count posts from this IP in the last hour
            const oneHourAgo = Date.now() - RATE_LIMIT_WINDOW;
            const results = await queryD1(
                `SELECT count(*) as count FROM readmes WHERE ip_address = ? AND created_at > ?`,
                [ip, oneHourAgo]
            );

            const count = results[0]?.count || 0;
            return count < RATE_LIMIT_MAX;
        };

        try {
            await queryD1(`CREATE TABLE IF NOT EXISTS readmes (id TEXT PRIMARY KEY, content TEXT, created_at INTEGER, ip_address TEXT)`);
            return await check();
        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            // Auto-migrate if column is missing (for existing prod DBs)
            if (errorMsg.includes("no such column") || errorMsg.includes("has no column")) {
                console.log("Migrating D1 Schema: Adding ip_address column...");
                try {
                    await queryD1(`ALTER TABLE readmes ADD COLUMN ip_address TEXT`);
                    return await check(); // Retry after migration
                } catch (migError) {
                    console.error("Migration Failed:", migError);
                }
            }
            console.error("Rate Limit Check Error:", error);
            return true; // Fail open on other errors
        }
    },

    async saveReadme(content: string, ip?: string): Promise<string> {
        const id = nanoid(10);
        // Create table if not exists (lazy init) - column added
        await queryD1(`CREATE TABLE IF NOT EXISTS readmes (id TEXT PRIMARY KEY, content TEXT, created_at INTEGER, ip_address TEXT)`);

        await queryD1(
            `INSERT INTO readmes (id, content, created_at, ip_address) VALUES (?, ?, ?, ?)`,
            [id, content, Date.now(), ip || 'unknown']
        );

        return id;
    },

    async getReadme(id: string): Promise<string | null> {
        // Check table exists first to avoid error on fresh DB
        try {
            const results = await queryD1(`SELECT content FROM readmes WHERE id = ? LIMIT 1`, [id]);
            if (results.length > 0) {
                return results[0].content as string;
            }
        } catch (error: any) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            // Suppress "no such table" error as it just means the DB is empty
            if (errorMsg.includes("no such table")) {
                return null;
            }
            console.error("D1 Fetch Error:", error);
        }
        return null;
    }
};

// --- 3. Export Logic ---
const useCloudflare = CF_ACCOUNT_ID && CF_DB_ID && CF_API_TOKEN;

export const db = useCloudflare ? cloudflareAdapter : localAdapter;

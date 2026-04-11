import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

// --- Interfaces ---
export interface ReadmeEntry {
    content: string;
    title?: string;
    createdAt?: number;
    passwordHash?: string;
    expiresAt?: number;
    userId?: string;
    slug?: string;
}

export interface UserEntry {
    id: string;
    email: string;
    name?: string;
    image?: string;
    provider: string;
    providerId: string;
    createdAt: number;
}

export interface CommentEntry {
    id: string;
    readmeId: string;
    userId?: string;
    authorName: string;
    content: string;
    createdAt: number;
}

export interface ReadmeVersion {
    id: string;
    readmeId: string;
    content: string;
    createdAt: number;
}

interface DBAdapter {
    saveReadme(content: string, ip?: string, title?: string, opts?: { password?: string; expiresIn?: number; userId?: string; slug?: string }): Promise<string>;
    getReadme(id: string): Promise<ReadmeEntry | null>;
    getReadmeBySlug(slug: string): Promise<(ReadmeEntry & { id: string }) | null>;
    updateReadme(id: string, content: string, userId: string, title?: string): Promise<boolean>;
    setSlug(id: string, slug: string, userId: string): Promise<boolean>;
    checkRateLimit(ip: string): Promise<boolean>;
    getReadmesByUser(userId: string): Promise<{ id: string; title?: string; createdAt: number; hasPassword: boolean; expiresAt?: number; slug?: string }[]>;
    deleteReadme(id: string, userId: string): Promise<boolean>;
    // Comments
    addComment(readmeId: string, authorName: string, content: string, userId?: string): Promise<string>;
    getComments(readmeId: string): Promise<CommentEntry[]>;
    // Version history
    getVersions(readmeId: string): Promise<ReadmeVersion[]>;
    // Analytics
    recordView(readmeId: string, ip: string, referrer?: string): Promise<void>;
    getViewCount(readmeId: string): Promise<number>;
    getViewStats(readmeId: string): Promise<{ total: number; unique: number; recent: { date: string; count: number }[] }>;
    // Users
    findOrCreateUser(email: string, name: string | undefined, image: string | undefined, provider: string, providerId: string): Promise<UserEntry>;
    getUser(id: string): Promise<UserEntry | null>;
}

// --- Crypto helpers ---
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_readflow_salt_v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password);
    return computed === hash;
}

// --- 1. Local Adapter (Development) ---
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ readmes: {}, users: {}, comments: {}, versions: {}, views: {} }));
    }
}

function readStore(): Record<string, any> {
    try {
        ensureDataDir();
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const store = JSON.parse(data);
        // Migrate old flat format
        if (!store.readmes) {
            return { readmes: store, users: {}, comments: {}, versions: {}, views: {} };
        }
        return store;
    } catch {
        return { readmes: {}, users: {}, comments: {}, versions: {}, views: {} };
    }
}

function writeStore(data: Record<string, any>) {
    try {
        ensureDataDir();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("DB Write Error", e);
    }
}

// In-memory fallback for environments without write access
const memoryStore: Record<string, Map<string, any>> = {
    readmes: new Map(),
    users: new Map(),
    comments: new Map(),
    versions: new Map(),
    views: new Map(),
};

const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 25;

const localAdapter: DBAdapter = {
    async checkRateLimit(): Promise<boolean> {
        return true;
    },

    async saveReadme(content, ip, title, opts): Promise<string> {
        const id = nanoid(10);
        const passwordHash = opts?.password ? await hashPassword(opts.password) : undefined;
        const expiresAt = opts?.expiresIn ? Date.now() + opts.expiresIn * 1000 : undefined;
        const data = { content, title, ip, createdAt: Date.now(), passwordHash, expiresAt, userId: opts?.userId, slug: opts?.slug };

        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            store.readmes[id] = data;
            // Save initial version
            if (!store.versions[id]) store.versions[id] = [];
            store.versions[id].push({ id: nanoid(10), readmeId: id, content, createdAt: Date.now() });
            writeStore(store);
        } else {
            memoryStore.readmes.set(id, data);
        }
        return id;
    },

    async getReadme(id): Promise<ReadmeEntry | null> {
        let entry: any = null;
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            entry = store.readmes[id] ?? null;
        } else {
            entry = memoryStore.readmes.get(id) ?? null;
        }
        if (!entry) return null;
        const content = entry.content || (typeof entry === 'string' ? entry : null);
        if (!content) return null;
        // Check expiry
        if (entry.expiresAt && Date.now() > entry.expiresAt) return null;
        return {
            content,
            title: entry.title || undefined,
            createdAt: entry.createdAt || undefined,
            passwordHash: entry.passwordHash || undefined,
            expiresAt: entry.expiresAt || undefined,
            userId: entry.userId || undefined,
            slug: entry.slug || undefined,
        };
    },

    async getReadmeBySlug(slug): Promise<(ReadmeEntry & { id: string }) | null> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            for (const [id, entry] of Object.entries(store.readmes) as [string, any][]) {
                if (entry.slug === slug) {
                    if (entry.expiresAt && Date.now() > entry.expiresAt) return null;
                    return {
                        id,
                        content: entry.content,
                        title: entry.title || undefined,
                        createdAt: entry.createdAt || undefined,
                        passwordHash: entry.passwordHash || undefined,
                        expiresAt: entry.expiresAt || undefined,
                        userId: entry.userId || undefined,
                        slug: entry.slug || undefined,
                    };
                }
            }
        } else {
            for (const [id, entry] of memoryStore.readmes.entries()) {
                if (entry.slug === slug) {
                    return { id, content: entry.content, title: entry.title, createdAt: entry.createdAt, passwordHash: entry.passwordHash, expiresAt: entry.expiresAt, userId: entry.userId, slug: entry.slug };
                }
            }
        }
        return null;
    },

    async updateReadme(id, content, userId, title): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry || entry.userId !== userId) return false;
            entry.content = content;
            if (title !== undefined) entry.title = title;
            // Save version
            if (!store.versions[id]) store.versions[id] = [];
            store.versions[id].push({ id: nanoid(10), readmeId: id, content, createdAt: Date.now() });
            writeStore(store);
            return true;
        } else {
            const entry = memoryStore.readmes.get(id);
            if (!entry || entry.userId !== userId) return false;
            entry.content = content;
            if (title !== undefined) entry.title = title;
            return true;
        }
    },

    async setSlug(id, slug, userId): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry || entry.userId !== userId) return false;
            // Check slug uniqueness
            for (const [oid, oentry] of Object.entries(store.readmes) as [string, any][]) {
                if (oid !== id && oentry.slug === slug) return false;
            }
            entry.slug = slug;
            writeStore(store);
            return true;
        } else {
            const entry = memoryStore.readmes.get(id);
            if (!entry || entry.userId !== userId) return false;
            for (const [oid, oentry] of memoryStore.readmes.entries()) {
                if (oid !== id && oentry.slug === slug) return false;
            }
            entry.slug = slug;
            return true;
        }
    },

    async getReadmesByUser(userId): Promise<{ id: string; title?: string; createdAt: number; hasPassword: boolean; expiresAt?: number; slug?: string }[]> {
        const results: { id: string; title?: string; createdAt: number; hasPassword: boolean; expiresAt?: number; slug?: string }[] = [];
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            for (const [id, entry] of Object.entries(store.readmes) as [string, any][]) {
                if (entry.userId === userId) {
                    results.push({ id, title: entry.title, createdAt: entry.createdAt || 0, hasPassword: !!entry.passwordHash, expiresAt: entry.expiresAt, slug: entry.slug });
                }
            }
        } else {
            for (const [id, entry] of memoryStore.readmes.entries()) {
                if (entry.userId === userId) {
                    results.push({ id, title: entry.title, createdAt: entry.createdAt || 0, hasPassword: !!entry.passwordHash, expiresAt: entry.expiresAt, slug: entry.slug });
                }
            }
        }
        return results.sort((a, b) => b.createdAt - a.createdAt);
    },

    async deleteReadme(id, userId): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry || entry.userId !== userId) return false;
            delete store.readmes[id];
            delete store.versions[id];
            delete store.comments[id];
            delete store.views[id];
            writeStore(store);
            return true;
        } else {
            const entry = memoryStore.readmes.get(id);
            if (!entry || entry.userId !== userId) return false;
            memoryStore.readmes.delete(id);
            return true;
        }
    },

    async addComment(readmeId, authorName, content, userId): Promise<string> {
        const id = nanoid(10);
        const comment = { id, readmeId, userId, authorName, content, createdAt: Date.now() };
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (!store.comments[readmeId]) store.comments[readmeId] = [];
            store.comments[readmeId].push(comment);
            writeStore(store);
        } else {
            if (!memoryStore.comments.has(readmeId)) memoryStore.comments.set(readmeId, []);
            memoryStore.comments.get(readmeId)!.push(comment);
        }
        return id;
    },

    async getComments(readmeId): Promise<CommentEntry[]> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            return (store.comments[readmeId] || []).sort((a: any, b: any) => a.createdAt - b.createdAt);
        }
        return (memoryStore.comments.get(readmeId) || []).sort((a: any, b: any) => a.createdAt - b.createdAt);
    },

    async getVersions(readmeId): Promise<ReadmeVersion[]> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            return (store.versions[readmeId] || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
        }
        return [];
    },

    async recordView(readmeId, ip, referrer): Promise<void> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (!store.views[readmeId]) store.views[readmeId] = [];
            store.views[readmeId].push({ ip, referrer, createdAt: Date.now() });
            writeStore(store);
        }
    },

    async getViewCount(readmeId): Promise<number> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            return (store.views[readmeId] || []).length;
        }
        return 0;
    },

    async getViewStats(readmeId): Promise<{ total: number; unique: number; recent: { date: string; count: number }[] }> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const views = store.views[readmeId] || [];
            const uniqueIps = new Set(views.map((v: any) => v.ip));
            const byDate = new Map<string, number>();
            for (const v of views) {
                const date = new Date(v.createdAt).toISOString().split('T')[0];
                byDate.set(date, (byDate.get(date) || 0) + 1);
            }
            const recent = Array.from(byDate.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 30);
            return { total: views.length, unique: uniqueIps.size, recent };
        }
        return { total: 0, unique: 0, recent: [] };
    },

    async findOrCreateUser(email, name, image, provider, providerId): Promise<UserEntry> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            // Find existing
            for (const [id, user] of Object.entries(store.users) as [string, any][]) {
                if (user.email === email) {
                    // Update profile info
                    user.name = name || user.name;
                    user.image = image || user.image;
                    writeStore(store);
                    return { id, ...user };
                }
            }
            // Create new
            const id = nanoid(12);
            const user = { email, name, image, provider, providerId, createdAt: Date.now() };
            store.users[id] = user;
            writeStore(store);
            return { id, ...user };
        } else {
            // Memory store
            for (const [id, user] of memoryStore.users.entries()) {
                if (user.email === email) return { id, ...user };
            }
            const id = nanoid(12);
            const user = { email, name, image, provider, providerId, createdAt: Date.now() };
            memoryStore.users.set(id, user);
            return { id, ...user };
        }
    },

    async getUser(id): Promise<UserEntry | null> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const user = store.users[id];
            if (!user) return null;
            return { id, ...user };
        }
        const user = memoryStore.users.get(id);
        if (!user) return null;
        return { id, ...user };
    },
};

// --- 2. Cloudflare D1 Adapter (Production via REST) ---
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID = process.env.CLOUDFLARE_DATABASE_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function queryD1(sql: string, params: any[] = []) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`D1 API Error: ${response.status} ${errorText}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(`D1 Query Failed: ${JSON.stringify(json.errors)}`);
    return json.result[0]?.results || [];
}

async function safeAlter(sql: string) {
    try { await queryD1(sql); } catch (e: any) {
        if (e?.message?.includes('duplicate column') || e?.message?.includes('already exists')) return;
        throw e;
    }
}

async function ensureD1Tables() {
    await queryD1(`CREATE TABLE IF NOT EXISTS readmes (id TEXT PRIMARY KEY, content TEXT, created_at INTEGER, ip_address TEXT, title TEXT, password_hash TEXT, expires_at INTEGER, user_id TEXT, slug TEXT)`);
    await queryD1(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, image TEXT, provider TEXT, provider_id TEXT, created_at INTEGER)`);
    await queryD1(`CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, readme_id TEXT, user_id TEXT, author_name TEXT, content TEXT, created_at INTEGER)`);
    await queryD1(`CREATE TABLE IF NOT EXISTS readme_versions (id TEXT PRIMARY KEY, readme_id TEXT, content TEXT, created_at INTEGER)`);
    await queryD1(`CREATE TABLE IF NOT EXISTS readme_views (id INTEGER PRIMARY KEY AUTOINCREMENT, readme_id TEXT, ip TEXT, referrer TEXT, created_at INTEGER)`);

    // Migrate: add columns that may be missing from older table versions
    await safeAlter(`ALTER TABLE readmes ADD COLUMN password_hash TEXT`);
    await safeAlter(`ALTER TABLE readmes ADD COLUMN expires_at INTEGER`);
    await safeAlter(`ALTER TABLE readmes ADD COLUMN user_id TEXT`);
    await safeAlter(`ALTER TABLE readmes ADD COLUMN title TEXT`);
    await safeAlter(`ALTER TABLE readmes ADD COLUMN slug TEXT`);
}

// Track init
let d1Initialized = false;
async function initD1() {
    if (d1Initialized) return;
    try {
        await ensureD1Tables();
        d1Initialized = true;
    } catch (e) {
        console.error('D1 init error:', e);
    }
}

const cloudflareAdapter: DBAdapter = {
    async checkRateLimit(ip: string): Promise<boolean> {
        await initD1();
        try {
            const oneHourAgo = Date.now() - RATE_LIMIT_WINDOW;
            const results = await queryD1(`SELECT count(*) as count FROM readmes WHERE ip_address = ? AND created_at > ?`, [ip, oneHourAgo]);
            return (results[0]?.count || 0) < RATE_LIMIT_MAX;
        } catch {
            return true;
        }
    },

    async saveReadme(content, ip, title, opts): Promise<string> {
        await initD1();
        const id = nanoid(10);
        const passwordHash = opts?.password ? await hashPassword(opts.password) : null;
        const expiresAt = opts?.expiresIn ? Date.now() + opts.expiresIn * 1000 : null;
        await queryD1(
            `INSERT INTO readmes (id, content, created_at, ip_address, title, password_hash, expires_at, user_id, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, content, Date.now(), ip || 'unknown', title || null, passwordHash, expiresAt, opts?.userId || null, opts?.slug || null]
        );
        await queryD1(
            `INSERT INTO readme_versions (id, readme_id, content, created_at) VALUES (?, ?, ?, ?)`,
            [nanoid(10), id, content, Date.now()]
        );
        return id;
    },

    async getReadme(id): Promise<ReadmeEntry | null> {
        await initD1();
        try {
            const results = await queryD1(`SELECT content, title, created_at, password_hash, expires_at, user_id, slug FROM readmes WHERE id = ? LIMIT 1`, [id]);
            if (results.length === 0) return null;
            const r = results[0];
            if (r.expires_at && Date.now() > r.expires_at) return null;
            return {
                content: r.content,
                title: r.title || undefined,
                createdAt: r.created_at || undefined,
                passwordHash: r.password_hash || undefined,
                expiresAt: r.expires_at || undefined,
                userId: r.user_id || undefined,
                slug: r.slug || undefined,
            };
        } catch {
            return null;
        }
    },

    async getReadmeBySlug(slug): Promise<(ReadmeEntry & { id: string }) | null> {
        await initD1();
        try {
            const results = await queryD1(`SELECT id, content, title, created_at, password_hash, expires_at, user_id, slug FROM readmes WHERE slug = ? LIMIT 1`, [slug]);
            if (results.length === 0) return null;
            const r = results[0];
            if (r.expires_at && Date.now() > r.expires_at) return null;
            return {
                id: r.id,
                content: r.content,
                title: r.title || undefined,
                createdAt: r.created_at || undefined,
                passwordHash: r.password_hash || undefined,
                expiresAt: r.expires_at || undefined,
                userId: r.user_id || undefined,
                slug: r.slug || undefined,
            };
        } catch {
            return null;
        }
    },

    async updateReadme(id, content, userId, title): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT user_id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0 || results[0].user_id !== userId) return false;
        const sets = ['content = ?'];
        const params: any[] = [content];
        if (title !== undefined) { sets.push('title = ?'); params.push(title); }
        params.push(id);
        await queryD1(`UPDATE readmes SET ${sets.join(', ')} WHERE id = ?`, params);
        await queryD1(`INSERT INTO readme_versions (id, readme_id, content, created_at) VALUES (?, ?, ?, ?)`, [nanoid(10), id, content, Date.now()]);
        return true;
    },

    async setSlug(id, slug, userId): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT user_id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0 || results[0].user_id !== userId) return false;
        // Check uniqueness
        const existing = await queryD1(`SELECT id FROM readmes WHERE slug = ? AND id != ? LIMIT 1`, [slug, id]);
        if (existing.length > 0) return false;
        await queryD1(`UPDATE readmes SET slug = ? WHERE id = ?`, [slug, id]);
        return true;
    },

    async getReadmesByUser(userId) {
        await initD1();
        const results = await queryD1(
            `SELECT id, title, created_at, password_hash, expires_at, slug FROM readmes WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        return results.map((r: any) => ({
            id: r.id,
            title: r.title || undefined,
            createdAt: r.created_at || 0,
            hasPassword: !!r.password_hash,
            expiresAt: r.expires_at || undefined,
            slug: r.slug || undefined,
        }));
    },

    async deleteReadme(id, userId): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT user_id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0 || results[0].user_id !== userId) return false;
        await queryD1(`DELETE FROM readmes WHERE id = ?`, [id]);
        await queryD1(`DELETE FROM comments WHERE readme_id = ?`, [id]);
        await queryD1(`DELETE FROM readme_versions WHERE readme_id = ?`, [id]);
        await queryD1(`DELETE FROM readme_views WHERE readme_id = ?`, [id]);
        return true;
    },

    async addComment(readmeId, authorName, content, userId): Promise<string> {
        await initD1();
        const id = nanoid(10);
        await queryD1(
            `INSERT INTO comments (id, readme_id, user_id, author_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, readmeId, userId || null, authorName, content, Date.now()]
        );
        return id;
    },

    async getComments(readmeId): Promise<CommentEntry[]> {
        await initD1();
        const results = await queryD1(`SELECT * FROM comments WHERE readme_id = ? ORDER BY created_at ASC`, [readmeId]);
        return results.map((r: any) => ({
            id: r.id, readmeId: r.readme_id, userId: r.user_id, authorName: r.author_name, content: r.content, createdAt: r.created_at,
        }));
    },

    async getVersions(readmeId): Promise<ReadmeVersion[]> {
        await initD1();
        const results = await queryD1(`SELECT * FROM readme_versions WHERE readme_id = ? ORDER BY created_at DESC`, [readmeId]);
        return results.map((r: any) => ({ id: r.id, readmeId: r.readme_id, content: r.content, createdAt: r.created_at }));
    },

    async recordView(readmeId, ip, referrer): Promise<void> {
        await initD1();
        await queryD1(`INSERT INTO readme_views (readme_id, ip, referrer, created_at) VALUES (?, ?, ?, ?)`, [readmeId, ip, referrer || null, Date.now()]);
    },

    async getViewCount(readmeId): Promise<number> {
        await initD1();
        const results = await queryD1(`SELECT count(*) as count FROM readme_views WHERE readme_id = ?`, [readmeId]);
        return results[0]?.count || 0;
    },

    async getViewStats(readmeId) {
        await initD1();
        const total = await queryD1(`SELECT count(*) as c FROM readme_views WHERE readme_id = ?`, [readmeId]);
        const unique = await queryD1(`SELECT count(DISTINCT ip) as c FROM readme_views WHERE readme_id = ?`, [readmeId]);
        const recent = await queryD1(
            `SELECT date(created_at / 1000, 'unixepoch') as date, count(*) as count FROM readme_views WHERE readme_id = ? GROUP BY date ORDER BY date DESC LIMIT 30`,
            [readmeId]
        );
        return {
            total: total[0]?.c || 0,
            unique: unique[0]?.c || 0,
            recent: recent.map((r: any) => ({ date: r.date, count: r.count })),
        };
    },

    async findOrCreateUser(email, name, image, provider, providerId): Promise<UserEntry> {
        await initD1();
        const existing = await queryD1(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
        if (existing.length > 0) {
            const u = existing[0];
            if (name || image) {
                await queryD1(`UPDATE users SET name = ?, image = ? WHERE id = ?`, [name || u.name, image || u.image, u.id]);
            }
            return { id: u.id, email: u.email, name: name || u.name, image: image || u.image, provider: u.provider, providerId: u.provider_id, createdAt: u.created_at };
        }
        const id = nanoid(12);
        await queryD1(
            `INSERT INTO users (id, email, name, image, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, email, name || null, image || null, provider, providerId, Date.now()]
        );
        return { id, email, name, image, provider, providerId, createdAt: Date.now() };
    },

    async getUser(id): Promise<UserEntry | null> {
        await initD1();
        const results = await queryD1(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0) return null;
        const u = results[0];
        return { id: u.id, email: u.email, name: u.name, image: u.image, provider: u.provider, providerId: u.provider_id, createdAt: u.created_at };
    },
};

// --- Export ---
const useCloudflare = CF_ACCOUNT_ID && CF_DB_ID && CF_API_TOKEN;
export const db = useCloudflare ? cloudflareAdapter : localAdapter;

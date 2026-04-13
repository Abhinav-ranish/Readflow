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
    plan?: 'free' | 'pro';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    aiCreditsUsed?: number;
    apiKey?: string;
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

export interface TeamEntry {
    id: string;
    name: string;
    ownerId: string;
    createdAt: number;
}

interface DBAdapter {
    saveReadme(content: string, ip?: string, title?: string, opts?: { password?: string; expiresIn?: number; userId?: string; slug?: string }): Promise<string>;
    getReadme(id: string): Promise<ReadmeEntry | null>;
    getReadmeBySlug(slug: string): Promise<(ReadmeEntry & { id: string }) | null>;
    updateReadme(id: string, content: string, userId: string, title?: string): Promise<boolean>;
    setSlug(id: string, slug: string, userId: string): Promise<boolean>;
    checkRateLimit(ip: string): Promise<boolean>;
    getReadmesByUser(userId: string): Promise<{ id: string; title?: string; createdAt: number; hasPassword: boolean; expiresAt?: number; slug?: string; folder?: string; pinned?: boolean; preview?: string }[]>;
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
    // Billing
    setUserPlan(userId: string, plan: 'free' | 'pro', stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<void>;
    incrementAiCredits(userId: string): Promise<number>;
    resetAiCredits(userId: string): Promise<void>;
    // Organization
    setDocFolder(id: string, userId: string, folder: string | null): Promise<boolean>;
    setDocPinned(id: string, userId: string, pinned: boolean): Promise<boolean>;
    // Admin
    getAllUsers(): Promise<UserEntry[]>;
    getAllDocs(): Promise<{ id: string; title?: string; userId?: string; createdAt: number; slug?: string; folder?: string; pinned?: boolean; preview?: string }[]>;
    adminDeleteDoc(id: string): Promise<boolean>;
    adminSetSlug(id: string, slug: string | null): Promise<boolean>;
    adminSetTitle(id: string, title: string): Promise<boolean>;
    adminDeleteUser(id: string): Promise<boolean>;
    adminReassignDoc(docId: string, newUserId: string | null): Promise<boolean>;
    adminUpdateContent(id: string, content: string, title?: string): Promise<boolean>;
    // API keys
    setApiKey(userId: string, apiKey: string): Promise<void>;
    getUserByApiKey(apiKey: string): Promise<UserEntry | null>;
    // Account
    deleteAccountAndDocs(userId: string): Promise<boolean>;
    // Teams
    createTeam(name: string, ownerId: string): Promise<string>;
    getTeamsByUser(userId: string): Promise<{ id: string; name: string; ownerId: string; role: string; memberCount: number; createdAt: number }[]>;
    getTeamMembers(teamId: string): Promise<{ userId: string; role: string; name?: string; email?: string; image?: string; joinedAt: number }[]>;
    addTeamMember(teamId: string, userId: string, role?: string): Promise<boolean>;
    removeTeamMember(teamId: string, userId: string): Promise<boolean>;
    getTeamDocs(teamId: string): Promise<{ id: string; title?: string; createdAt: number; hasPassword: boolean; slug?: string; folder?: string; preview?: string }[]>;
    setDocTeam(docId: string, teamId: string | null, userId: string): Promise<boolean>;
    getTeam(teamId: string): Promise<{ id: string; name: string; ownerId: string; createdAt: number } | null>;
    // Presence
    setPresence(docId: string, userId: string, userName: string, userImage?: string): Promise<void>;
    getPresence(docId: string): Promise<{ userId: string; name: string; image?: string; lastSeen: number }[]>;
    // Admin stats
    getAdminStats(): Promise<{
        totalUsers: number;
        totalDocs: number;
        totalViews: number;
        userGrowth: { date: string; count: number }[];
        docGrowth: { date: string; count: number }[];
        viewsPerDay: { date: string; count: number }[];
        topDocs: { id: string; title?: string; views: number }[];
    }>;
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
        fs.writeFileSync(DATA_FILE, JSON.stringify({ readmes: {}, users: {}, comments: {}, versions: {}, views: {}, teams: {}, teamMembers: {}, presence: {} }));
    }
}

function readStore(): Record<string, any> {
    try {
        ensureDataDir();
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const store = JSON.parse(data);
        // Migrate old flat format
        if (!store.readmes) {
            return { readmes: store, users: {}, comments: {}, versions: {}, views: {}, teams: {}, teamMembers: {}, presence: {} };
        }
        if (!store.teams) { store.teams = {}; store.teamMembers = {}; store.presence = {}; }
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

    async getReadmesByUser(userId): Promise<{ id: string; title?: string; createdAt: number; hasPassword: boolean; expiresAt?: number; slug?: string; folder?: string; pinned?: boolean; preview?: string }[]> {
        const results: { id: string; title?: string; createdAt: number; hasPassword: boolean; expiresAt?: number; slug?: string; folder?: string; pinned?: boolean; preview?: string }[] = [];
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            for (const [id, entry] of Object.entries(store.readmes) as [string, any][]) {
                if (entry.userId === userId) {
                    results.push({ id, title: entry.title, createdAt: entry.createdAt || 0, hasPassword: !!entry.passwordHash, expiresAt: entry.expiresAt, slug: entry.slug, folder: entry.folder, pinned: entry.pinned, preview: typeof entry.content === 'string' ? entry.content.slice(0, 200) : undefined });
                }
            }
        } else {
            for (const [id, entry] of memoryStore.readmes.entries()) {
                if (entry.userId === userId) {
                    results.push({ id, title: entry.title, createdAt: entry.createdAt || 0, hasPassword: !!entry.passwordHash, expiresAt: entry.expiresAt, slug: entry.slug, folder: entry.folder, pinned: entry.pinned, preview: typeof entry.content === 'string' ? entry.content.slice(0, 200) : undefined });
                }
            }
        }
        // Pinned first, then by date
        return results.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.createdAt - a.createdAt;
        });
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

    async setUserPlan(userId, plan, stripeCustomerId, stripeSubscriptionId): Promise<void> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const user = store.users[userId];
            if (user) {
                user.plan = plan;
                if (stripeCustomerId) user.stripeCustomerId = stripeCustomerId;
                if (stripeSubscriptionId) user.stripeSubscriptionId = stripeSubscriptionId;
                if (plan === 'free') user.aiCreditsUsed = 0;
                writeStore(store);
            }
        } else {
            const user = memoryStore.users.get(userId);
            if (user) {
                user.plan = plan;
                if (stripeCustomerId) user.stripeCustomerId = stripeCustomerId;
                if (stripeSubscriptionId) user.stripeSubscriptionId = stripeSubscriptionId;
            }
        }
    },

    async incrementAiCredits(userId): Promise<number> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const user = store.users[userId];
            if (!user) return 0;
            user.aiCreditsUsed = (user.aiCreditsUsed || 0) + 1;
            writeStore(store);
            return user.aiCreditsUsed;
        }
        const user = memoryStore.users.get(userId);
        if (!user) return 0;
        user.aiCreditsUsed = (user.aiCreditsUsed || 0) + 1;
        return user.aiCreditsUsed;
    },

    async resetAiCredits(userId): Promise<void> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const user = store.users[userId];
            if (user) { user.aiCreditsUsed = 0; writeStore(store); }
        } else {
            const user = memoryStore.users.get(userId);
            if (user) user.aiCreditsUsed = 0;
        }
    },

    async setDocFolder(id, userId, folder): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry || entry.userId !== userId) return false;
            entry.folder = folder;
            writeStore(store);
            return true;
        }
        const entry = memoryStore.readmes.get(id);
        if (!entry || entry.userId !== userId) return false;
        entry.folder = folder;
        return true;
    },

    async setDocPinned(id, userId, pinned): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry || entry.userId !== userId) return false;
            entry.pinned = pinned;
            writeStore(store);
            return true;
        }
        const entry = memoryStore.readmes.get(id);
        if (!entry || entry.userId !== userId) return false;
        entry.pinned = pinned;
        return true;
    },

    async getAllUsers(): Promise<UserEntry[]> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            return Object.entries(store.users).map(([id, u]: [string, any]) => ({ id, ...u }));
        }
        return Array.from(memoryStore.users.entries()).map(([id, u]) => ({ id, ...u }));
    },

    async getAllDocs() {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            return Object.entries(store.readmes).map(([id, r]: [string, any]) => ({
                id, title: r.title, userId: r.userId, createdAt: r.createdAt, slug: r.slug, folder: r.folder, pinned: r.pinned,
                preview: typeof r.content === 'string' ? r.content.slice(0, 200) : undefined,
            }));
        }
        return Array.from(memoryStore.readmes.entries()).map(([id, r]) => ({
            id, title: r.title, userId: r.userId, createdAt: r.createdAt, slug: r.slug, folder: r.folder, pinned: r.pinned,
            preview: typeof r.content === 'string' ? r.content.slice(0, 200) : undefined,
        }));
    },

    async adminDeleteDoc(id): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (!store.readmes[id]) return false;
            delete store.readmes[id];
            delete store.versions[id];
            delete store.comments[id];
            delete store.views[id];
            writeStore(store);
            return true;
        }
        const entry = memoryStore.readmes.get(id);
        if (!entry) return false;
        memoryStore.readmes.delete(id);
        return true;
    },

    async adminSetSlug(id, slug): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry) return false;
            if (slug) {
                for (const [oid, oentry] of Object.entries(store.readmes) as [string, any][]) {
                    if (oid !== id && oentry.slug === slug) return false;
                }
            }
            entry.slug = slug || undefined;
            writeStore(store);
            return true;
        }
        const entry = memoryStore.readmes.get(id);
        if (!entry) return false;
        entry.slug = slug || undefined;
        return true;
    },

    async adminSetTitle(id, title): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry) return false;
            entry.title = title;
            writeStore(store);
            return true;
        }
        const entry = memoryStore.readmes.get(id);
        if (!entry) return false;
        entry.title = title;
        return true;
    },

    async adminDeleteUser(id): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (!store.users[id]) return false;
            delete store.users[id];
            writeStore(store);
            return true;
        }
        if (!memoryStore.users.has(id)) return false;
        memoryStore.users.delete(id);
        return true;
    },

    async adminReassignDoc(docId, newUserId): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (!store.readmes[docId]) return false;
            store.readmes[docId].userId = newUserId || undefined;
            writeStore(store);
            return true;
        }
        const doc = memoryStore.readmes.get(docId);
        if (!doc) return false;
        doc.userId = newUserId || undefined;
        return true;
    },

    async adminUpdateContent(id, content, title): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const entry = store.readmes[id];
            if (!entry) return false;
            entry.content = content;
            if (title !== undefined) entry.title = title;
            if (!store.versions[id]) store.versions[id] = [];
            store.versions[id].push({ id: nanoid(10), readmeId: id, content, createdAt: Date.now() });
            writeStore(store);
            return true;
        }
        const doc = memoryStore.readmes.get(id);
        if (!doc) return false;
        doc.content = content;
        if (title !== undefined) doc.title = title;
        return true;
    },

    async setApiKey(userId, apiKey): Promise<void> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (store.users[userId]) { store.users[userId].apiKey = apiKey; writeStore(store); }
        } else {
            const user = memoryStore.users.get(userId);
            if (user) user.apiKey = apiKey;
        }
    },

    async getUserByApiKey(apiKey): Promise<UserEntry | null> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            for (const [id, u] of Object.entries(store.users) as [string, any][]) {
                if (u.apiKey === apiKey) return { id, ...u };
            }
            return null;
        }
        for (const [id, u] of memoryStore.users.entries()) {
            if (u.apiKey === apiKey) return { id, ...u };
        }
        return null;
    },

    async deleteAccountAndDocs(userId): Promise<boolean> {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            if (!store.users[userId]) return false;
            // Delete all user docs, their versions, and comments
            for (const [id, entry] of Object.entries(store.readmes) as [string, any][]) {
                if (entry.userId === userId) {
                    delete store.readmes[id];
                    delete store.versions[id];
                    if (store.comments) {
                        for (const [cid, c] of Object.entries(store.comments) as [string, any][]) {
                            if (c.readmeId === id) delete store.comments[cid];
                        }
                    }
                }
            }
            delete store.users[userId];
            writeStore(store);
            return true;
        }
        if (!memoryStore.users.has(userId)) return false;
        for (const [id, entry] of memoryStore.readmes.entries()) {
            if (entry.userId === userId) {
                memoryStore.readmes.delete(id);
                memoryStore.versions.delete(id);
            }
        }
        memoryStore.users.delete(userId);
        return true;
    },

    async getAdminStats() {
        if (process.env.NODE_ENV === 'development') {
            const store = readStore();
            const users = Object.values(store.users || {}) as any[];
            const readmes = Object.entries(store.readmes || {}) as [string, any][];
            const allViews = store.views || {};

            let totalViews = 0;
            const viewsByDay: Record<string, number> = {};
            const topDocsMap: Record<string, number> = {};
            for (const [docId, views] of Object.entries(allViews) as [string, any[]][]) {
                totalViews += views.length;
                topDocsMap[docId] = views.length;
                for (const v of views) {
                    const d = new Date(v.createdAt).toISOString().slice(0, 10);
                    viewsByDay[d] = (viewsByDay[d] || 0) + 1;
                }
            }

            const usersByDay: Record<string, number> = {};
            for (const u of users) {
                const d = new Date(u.createdAt).toISOString().slice(0, 10);
                usersByDay[d] = (usersByDay[d] || 0) + 1;
            }

            const docsByDay: Record<string, number> = {};
            for (const [, r] of readmes) {
                if (r.createdAt) {
                    const d = new Date(r.createdAt).toISOString().slice(0, 10);
                    docsByDay[d] = (docsByDay[d] || 0) + 1;
                }
            }

            const toSorted = (map: Record<string, number>) =>
                Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30).map(([date, count]) => ({ date, count }));

            const topDocs = Object.entries(topDocsMap)
                .sort((a, b) => b[1] - a[1]).slice(0, 10)
                .map(([id, views]) => {
                    const entry = (store.readmes as any)[id];
                    return { id, title: entry?.title, views };
                });

            return {
                totalUsers: users.length,
                totalDocs: readmes.length,
                totalViews,
                userGrowth: toSorted(usersByDay),
                docGrowth: toSorted(docsByDay),
                viewsPerDay: toSorted(viewsByDay),
                topDocs,
            };
        }
        // Memory store fallback
        return { totalUsers: 0, totalDocs: 0, totalViews: 0, userGrowth: [], docGrowth: [], viewsPerDay: [], topDocs: [] };
    },

    // --- Teams (local) ---
    async createTeam(name, ownerId) {
        const id = nanoid(10);
        const store = readStore();
        store.teams[id] = { name, ownerId, createdAt: Date.now() };
        if (!store.teamMembers[id]) store.teamMembers[id] = {};
        store.teamMembers[id][ownerId] = { role: 'owner', joinedAt: Date.now() };
        writeStore(store);
        return id;
    },
    async getTeam(teamId) {
        const store = readStore();
        const t = store.teams?.[teamId];
        if (!t) return null;
        return { id: teamId, name: t.name, ownerId: t.ownerId, createdAt: t.createdAt };
    },
    async getTeamsByUser(userId) {
        const store = readStore();
        const results: any[] = [];
        for (const [teamId, members] of Object.entries(store.teamMembers || {}) as [string, any][]) {
            if (members[userId]) {
                const t = store.teams[teamId];
                if (t) {
                    results.push({ id: teamId, name: t.name, ownerId: t.ownerId, role: members[userId].role, memberCount: Object.keys(members).length, createdAt: t.createdAt });
                }
            }
        }
        return results;
    },
    async getTeamMembers(teamId) {
        const store = readStore();
        const members = store.teamMembers?.[teamId] || {};
        return Object.entries(members).map(([userId, m]: [string, any]) => {
            const user = store.users?.[userId];
            return { userId, role: m.role, name: user?.name, email: user?.email, image: user?.image, joinedAt: m.joinedAt };
        });
    },
    async addTeamMember(teamId, userId, role = 'member') {
        const store = readStore();
        if (!store.teams[teamId]) return false;
        if (!store.teamMembers[teamId]) store.teamMembers[teamId] = {};
        store.teamMembers[teamId][userId] = { role, joinedAt: Date.now() };
        writeStore(store);
        return true;
    },
    async removeTeamMember(teamId, userId) {
        const store = readStore();
        if (!store.teamMembers?.[teamId]?.[userId]) return false;
        delete store.teamMembers[teamId][userId];
        writeStore(store);
        return true;
    },
    async getTeamDocs(teamId) {
        const store = readStore();
        return Object.entries(store.readmes || {})
            .filter(([, r]: [string, any]) => r.teamId === teamId)
            .map(([id, r]: [string, any]) => ({
                id, title: r.title, createdAt: r.createdAt, hasPassword: !!r.passwordHash, slug: r.slug, folder: r.folder,
                preview: (r.content || '').slice(0, 200),
            }));
    },
    async setDocTeam(docId, teamId, userId) {
        const store = readStore();
        const entry = store.readmes[docId];
        if (!entry || entry.userId !== userId) return false;
        entry.teamId = teamId;
        writeStore(store);
        return true;
    },

    // --- Presence (local) ---
    async setPresence(docId, userId, userName, userImage) {
        const store = readStore();
        if (!store.presence[docId]) store.presence[docId] = {};
        store.presence[docId][userId] = { name: userName, image: userImage, lastSeen: Date.now() };
        writeStore(store);
    },
    async getPresence(docId) {
        const store = readStore();
        const entries = store.presence?.[docId] || {};
        const cutoff = Date.now() - 60000; // 60 second window
        return Object.entries(entries)
            .filter(([, p]: [string, any]) => p.lastSeen > cutoff)
            .map(([userId, p]: [string, any]) => ({ userId, name: p.name, image: p.image, lastSeen: p.lastSeen }));
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
        // Ignore "duplicate column" errors — column already exists
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
    await safeAlter(`ALTER TABLE readmes ADD COLUMN folder TEXT`);
    await safeAlter(`ALTER TABLE readmes ADD COLUMN pinned INTEGER DEFAULT 0`);
    // User plan columns
    await safeAlter(`ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'`);
    await safeAlter(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`);
    await safeAlter(`ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT`);
    await safeAlter(`ALTER TABLE users ADD COLUMN ai_credits_used INTEGER DEFAULT 0`);
    // Teams
    await queryD1(`CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL, created_at INTEGER)`);
    await queryD1(`CREATE TABLE IF NOT EXISTS team_members (team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'member', joined_at INTEGER, PRIMARY KEY (team_id, user_id))`);
    await safeAlter(`ALTER TABLE readmes ADD COLUMN team_id TEXT`);
    // Presence
    await queryD1(`CREATE TABLE IF NOT EXISTS presence (doc_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT, user_image TEXT, last_seen INTEGER, PRIMARY KEY (doc_id, user_id))`);
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
            `SELECT id, title, created_at, password_hash, expires_at, slug, folder, pinned, SUBSTR(content, 1, 200) as preview FROM readmes WHERE user_id = ? ORDER BY pinned DESC, created_at DESC`,
            [userId]
        );
        return results.map((r: any) => ({
            id: r.id,
            title: r.title || undefined,
            createdAt: r.created_at || 0,
            hasPassword: !!r.password_hash,
            expiresAt: r.expires_at || undefined,
            slug: r.slug || undefined,
            folder: r.folder || undefined,
            pinned: !!r.pinned,
            preview: r.preview || undefined,
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
        return { id: u.id, email: u.email, name: u.name, image: u.image, provider: u.provider, providerId: u.provider_id, createdAt: u.created_at, plan: u.plan || 'free', stripeCustomerId: u.stripe_customer_id, stripeSubscriptionId: u.stripe_subscription_id, aiCreditsUsed: u.ai_credits_used || 0 };
    },

    async setUserPlan(userId, plan, stripeCustomerId, stripeSubscriptionId): Promise<void> {
        await initD1();
        const sets = ['plan = ?'];
        const params: any[] = [plan];
        if (stripeCustomerId) { sets.push('stripe_customer_id = ?'); params.push(stripeCustomerId); }
        if (stripeSubscriptionId) { sets.push('stripe_subscription_id = ?'); params.push(stripeSubscriptionId); }
        if (plan === 'free') { sets.push('ai_credits_used = 0'); }
        params.push(userId);
        await queryD1(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    },

    async incrementAiCredits(userId): Promise<number> {
        await initD1();
        await queryD1(`UPDATE users SET ai_credits_used = COALESCE(ai_credits_used, 0) + 1 WHERE id = ?`, [userId]);
        const results = await queryD1(`SELECT ai_credits_used FROM users WHERE id = ?`, [userId]);
        return results[0]?.ai_credits_used || 0;
    },

    async resetAiCredits(userId): Promise<void> {
        await initD1();
        await queryD1(`UPDATE users SET ai_credits_used = 0 WHERE id = ?`, [userId]);
    },

    async setDocFolder(id, userId, folder): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT user_id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0 || results[0].user_id !== userId) return false;
        await queryD1(`UPDATE readmes SET folder = ? WHERE id = ?`, [folder, id]);
        return true;
    },

    async setDocPinned(id, userId, pinned): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT user_id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0 || results[0].user_id !== userId) return false;
        await queryD1(`UPDATE readmes SET pinned = ? WHERE id = ?`, [pinned ? 1 : 0, id]);
        return true;
    },

    async getAllUsers(): Promise<UserEntry[]> {
        await initD1();
        const results = await queryD1(`SELECT * FROM users ORDER BY created_at DESC`);
        return results.map((u: any) => ({
            id: u.id, email: u.email, name: u.name, image: u.image, provider: u.provider,
            providerId: u.provider_id, createdAt: u.created_at, plan: u.plan || 'free',
            stripeCustomerId: u.stripe_customer_id, stripeSubscriptionId: u.stripe_subscription_id,
            aiCreditsUsed: u.ai_credits_used || 0,
        }));
    },

    async getAllDocs() {
        await initD1();
        const results = await queryD1(`SELECT id, title, user_id, created_at, slug, folder, pinned, SUBSTR(content, 1, 200) as preview FROM readmes ORDER BY created_at DESC`);
        return results.map((r: any) => ({
            id: r.id, title: r.title, userId: r.user_id, createdAt: r.created_at,
            slug: r.slug, folder: r.folder, pinned: !!r.pinned, preview: r.preview || undefined,
        }));
    },

    async adminDeleteDoc(id): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0) return false;
        await queryD1(`DELETE FROM readmes WHERE id = ?`, [id]);
        await queryD1(`DELETE FROM comments WHERE readme_id = ?`, [id]);
        await queryD1(`DELETE FROM readme_versions WHERE readme_id = ?`, [id]);
        await queryD1(`DELETE FROM readme_views WHERE readme_id = ?`, [id]);
        return true;
    },

    async adminSetSlug(id, slug): Promise<boolean> {
        await initD1();
        if (slug) {
            const existing = await queryD1(`SELECT id FROM readmes WHERE slug = ? AND id != ? LIMIT 1`, [slug, id]);
            if (existing.length > 0) return false;
        }
        await queryD1(`UPDATE readmes SET slug = ? WHERE id = ?`, [slug || null, id]);
        return true;
    },

    async adminSetTitle(id, title): Promise<boolean> {
        await initD1();
        await queryD1(`UPDATE readmes SET title = ? WHERE id = ?`, [title, id]);
        return true;
    },

    async adminDeleteUser(id): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT id FROM users WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0) return false;
        await queryD1(`DELETE FROM users WHERE id = ?`, [id]);
        return true;
    },

    async adminReassignDoc(docId, newUserId): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT id FROM readmes WHERE id = ? LIMIT 1`, [docId]);
        if (results.length === 0) return false;
        await queryD1(`UPDATE readmes SET user_id = ? WHERE id = ?`, [newUserId || null, docId]);
        return true;
    },

    async adminUpdateContent(id, content, title): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT id FROM readmes WHERE id = ? LIMIT 1`, [id]);
        if (results.length === 0) return false;
        const sets = ['content = ?'];
        const params: any[] = [content];
        if (title !== undefined) { sets.push('title = ?'); params.push(title); }
        params.push(id);
        await queryD1(`UPDATE readmes SET ${sets.join(', ')} WHERE id = ?`, params);
        await queryD1(`INSERT INTO readme_versions (id, readme_id, content, created_at) VALUES (?, ?, ?, ?)`, [nanoid(10), id, content, Date.now()]);
        return true;
    },

    async setApiKey(userId, apiKey): Promise<void> {
        await initD1();
        await safeAlter(`ALTER TABLE users ADD COLUMN api_key TEXT`);
        await queryD1(`UPDATE users SET api_key = ? WHERE id = ?`, [apiKey, userId]);
    },

    async getUserByApiKey(apiKey): Promise<UserEntry | null> {
        await initD1();
        const results = await queryD1(`SELECT * FROM users WHERE api_key = ? LIMIT 1`, [apiKey]);
        if (results.length === 0) return null;
        const u = results[0];
        return { id: u.id, email: u.email, name: u.name, image: u.image, provider: u.provider, providerId: u.provider_id, createdAt: u.created_at, plan: u.plan || 'free', apiKey: u.api_key };
    },

    async deleteAccountAndDocs(userId): Promise<boolean> {
        await initD1();
        const results = await queryD1(`SELECT id FROM users WHERE id = ? LIMIT 1`, [userId]);
        if (results.length === 0) return false;
        // Get all user docs
        const docs = await queryD1(`SELECT id FROM readmes WHERE user_id = ?`, [userId]);
        for (const doc of docs) {
            await queryD1(`DELETE FROM comments WHERE readme_id = ?`, [doc.id]);
            await queryD1(`DELETE FROM readme_versions WHERE readme_id = ?`, [doc.id]);
            await queryD1(`DELETE FROM readmes WHERE id = ?`, [doc.id]);
        }
        await queryD1(`DELETE FROM users WHERE id = ?`, [userId]);
        return true;
    },

    async getAdminStats() {
        await initD1();
        const [usersR, docsR, viewsR, userGrowthR, docGrowthR, viewsPerDayR, topDocsR] = await Promise.all([
            queryD1(`SELECT count(*) as c FROM users`),
            queryD1(`SELECT count(*) as c FROM readmes`),
            queryD1(`SELECT count(*) as c FROM readme_views`),
            queryD1(`SELECT date(created_at / 1000, 'unixepoch') as date, count(*) as count FROM users GROUP BY date ORDER BY date DESC LIMIT 30`),
            queryD1(`SELECT date(created_at / 1000, 'unixepoch') as date, count(*) as count FROM readmes GROUP BY date ORDER BY date DESC LIMIT 30`),
            queryD1(`SELECT date(created_at / 1000, 'unixepoch') as date, count(*) as count FROM readme_views GROUP BY date ORDER BY date DESC LIMIT 30`),
            queryD1(`SELECT r.id, r.title, count(v.id) as views FROM readmes r LEFT JOIN readme_views v ON v.readme_id = r.id GROUP BY r.id ORDER BY views DESC LIMIT 10`),
        ]);
        return {
            totalUsers: usersR[0]?.c || 0,
            totalDocs: docsR[0]?.c || 0,
            totalViews: viewsR[0]?.c || 0,
            userGrowth: userGrowthR.map((r: any) => ({ date: r.date, count: r.count })),
            docGrowth: docGrowthR.map((r: any) => ({ date: r.date, count: r.count })),
            viewsPerDay: viewsPerDayR.map((r: any) => ({ date: r.date, count: r.count })),
            topDocs: topDocsR.map((r: any) => ({ id: r.id, title: r.title, views: r.views })),
        };
    },

    // --- Teams (D1) ---
    async createTeam(name, ownerId) {
        await initD1();
        const id = nanoid(10);
        await queryD1(`INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`, [id, name, ownerId, Date.now()]);
        await queryD1(`INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`, [id, ownerId, Date.now()]);
        return id;
    },
    async getTeam(teamId) {
        await initD1();
        const results = await queryD1(`SELECT * FROM teams WHERE id = ? LIMIT 1`, [teamId]);
        if (results.length === 0) return null;
        const t = results[0];
        return { id: t.id, name: t.name, ownerId: t.owner_id, createdAt: t.created_at };
    },
    async getTeamsByUser(userId) {
        await initD1();
        const results = await queryD1(
            `SELECT t.id, t.name, t.owner_id, t.created_at, tm.role, (SELECT count(*) FROM team_members WHERE team_id = t.id) as member_count
             FROM teams t JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = ?`, [userId]);
        return results.map((r: any) => ({ id: r.id, name: r.name, ownerId: r.owner_id, role: r.role, memberCount: r.member_count, createdAt: r.created_at }));
    },
    async getTeamMembers(teamId) {
        await initD1();
        const results = await queryD1(
            `SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.email, u.image
             FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?`, [teamId]);
        return results.map((r: any) => ({ userId: r.user_id, role: r.role, name: r.name, email: r.email, image: r.image, joinedAt: r.joined_at }));
    },
    async addTeamMember(teamId, userId, role = 'member') {
        await initD1();
        try {
            await queryD1(`INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`, [teamId, userId, role, Date.now()]);
            return true;
        } catch { return false; }
    },
    async removeTeamMember(teamId, userId) {
        await initD1();
        await queryD1(`DELETE FROM team_members WHERE team_id = ? AND user_id = ?`, [teamId, userId]);
        return true;
    },
    async getTeamDocs(teamId) {
        await initD1();
        const results = await queryD1(
            `SELECT id, title, created_at, password_hash, slug, folder, substr(content, 1, 200) as preview FROM readmes WHERE team_id = ? ORDER BY created_at DESC`, [teamId]);
        return results.map((r: any) => ({ id: r.id, title: r.title, createdAt: r.created_at, hasPassword: !!r.password_hash, slug: r.slug, folder: r.folder, preview: r.preview }));
    },
    async setDocTeam(docId, teamId, userId) {
        await initD1();
        const results = await queryD1(`SELECT user_id FROM readmes WHERE id = ? LIMIT 1`, [docId]);
        if (results.length === 0 || results[0].user_id !== userId) return false;
        await queryD1(`UPDATE readmes SET team_id = ? WHERE id = ?`, [teamId, docId]);
        return true;
    },

    // --- Presence (D1) ---
    async setPresence(docId, userId, userName, userImage) {
        await initD1();
        await queryD1(
            `INSERT INTO presence (doc_id, user_id, user_name, user_image, last_seen) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(doc_id, user_id) DO UPDATE SET user_name = excluded.user_name, user_image = excluded.user_image, last_seen = excluded.last_seen`,
            [docId, userId, userName, userImage || null, Date.now()]);
    },
    async getPresence(docId) {
        await initD1();
        const cutoff = Date.now() - 60000;
        const results = await queryD1(`SELECT user_id, user_name, user_image, last_seen FROM presence WHERE doc_id = ? AND last_seen > ?`, [docId, cutoff]);
        return results.map((r: any) => ({ userId: r.user_id, name: r.user_name, image: r.user_image, lastSeen: r.last_seen }));
    },
};

// --- Export ---
const useCloudflare = CF_ACCOUNT_ID && CF_DB_ID && CF_API_TOKEN;
export const db = useCloudflare ? cloudflareAdapter : localAdapter;

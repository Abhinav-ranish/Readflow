import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// Default template that ships with the editor — dedup shares of unmodified content
const DEFAULT_CONTENT = `# Welcome to Readflow

Start typing in the editor to the left to see your changes appear here instantly.

## Features
- **Markdown Support**: Headers, lists, code blocks, and more.
- **Live Preview**: See what you write in real-time.
- **Private Sharing**: Share a read-only link instantly.

\`\`\`javascript
console.log("Happy coding!");
\`\`\`
`;

const DEFAULT_SLUG = '_default-readme';
let cachedDefaultId: string | null = null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, title, password, expiresIn, upsertSlug } = body;

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        // Dedup: if content is the unmodified default template, return existing shared doc
        if (content.trim() === DEFAULT_CONTENT.trim() && !password && !expiresIn && !upsertSlug) {
            const url = new URL(request.url);
            // Try cache first
            if (cachedDefaultId) {
                const existing = await db.getReadme(cachedDefaultId);
                if (existing) {
                    return NextResponse.json({ id: cachedDefaultId, url: `${url.origin}/s/${cachedDefaultId}`, deduplicated: true });
                }
                cachedDefaultId = null;
            }
            // Try by slug
            const bySlug = await db.getReadmeBySlug(DEFAULT_SLUG);
            if (bySlug) {
                cachedDefaultId = bySlug.id;
                return NextResponse.json({ id: bySlug.id, url: `${url.origin}/s/${bySlug.id}`, deduplicated: true });
            }
            // First time — create the canonical default doc (falls through to normal create with slug)
            const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
            const id = await db.saveReadme(content, ip, 'Untitled', { slug: DEFAULT_SLUG });
            cachedDefaultId = id;
            return NextResponse.json({ id, url: `${url.origin}/s/${id}`, deduplicated: true });
        }

        const cleanTitle = (typeof title === 'string' && title.trim()) ? title.trim().slice(0, 100) : undefined;

        // Validate expiresIn if provided (in seconds, max 30 days)
        let validExpiry: number | undefined;
        if (expiresIn !== undefined) {
            const num = Number(expiresIn);
            if (isNaN(num) || num < 60 || num > 30 * 24 * 3600) {
                return NextResponse.json({ error: 'expiresIn must be between 60 and 2592000 seconds' }, { status: 400 });
            }
            validExpiry = num;
        }

        // Get user — authentication required
        let userId: string | undefined;
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const apiKey = authHeader.slice(7).trim();
            if (apiKey) {
                const keyUser = await db.getUserByApiKey(apiKey);
                if (keyUser) userId = keyUser.id;
            }
        }
        if (!userId) {
            try {
                const session = await auth();
                userId = (session?.user as any)?.dbId;
            } catch {}
        }

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required. Log in or provide an API token.' }, { status: 401 });
        }

        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

        // Upsert by slug: if upsertSlug provided and user is authenticated,
        // find existing doc by slug and update it (slug is unique per doc, no collision risk)
        if (upsertSlug && userId) {
            const existing = await db.getReadmeBySlug(upsertSlug);
            if (existing && existing.userId === userId) {
                await db.updateReadme(existing.id, content, userId, cleanTitle);
                const url = new URL(request.url);
                return NextResponse.json({ id: existing.id, url: `${url.origin}/s/${existing.id}`, slug: upsertSlug, updated: true });
            }
            // Slug doesn't exist yet — create new doc and assign the slug
        }

        const id = await db.saveReadme(content, ip, cleanTitle, {
            password: typeof password === 'string' && password.length > 0 ? password : undefined,
            expiresIn: validExpiry,
            userId,
            slug: upsertSlug || undefined,
        });

        const url = new URL(request.url);
        const shareUrl = `${url.origin}/s/${id}`;

        return NextResponse.json({ id, url: shareUrl, slug: upsertSlug || undefined, updated: false });
    } catch (error) {
        console.error('Share Error:', error);
        return NextResponse.json({ error: 'Failed to share' }, { status: 500 });
    }
}

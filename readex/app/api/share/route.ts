import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, title, password, expiresIn } = body;

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
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

        // Rate Limiting
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const allowed = await db.checkRateLimit(ip);
        if (!allowed) {
            return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
        }

        // Get user if authenticated
        let userId: string | undefined;
        try {
            const session = await auth();
            userId = (session?.user as any)?.dbId;
        } catch { /* not authenticated, that's fine */ }

        const id = await db.saveReadme(content, ip, cleanTitle, {
            password: typeof password === 'string' && password.length > 0 ? password : undefined,
            expiresIn: validExpiry,
            userId,
        });

        const url = new URL(request.url);
        const shareUrl = `${url.origin}/s/${id}`;

        return NextResponse.json({ id, url: shareUrl });
    } catch (error) {
        console.error('Share Error:', error);
        return NextResponse.json({ error: 'Failed to share' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    let userId: string | undefined;

    // Support Bearer token auth (CLI)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.slice(7).trim();
        if (apiKey) {
            const keyUser = await db.getUserByApiKey(apiKey);
            if (keyUser) userId = keyUser.id;
        }
    }

    // Fall back to session auth
    if (!userId) {
        const session = await auth();
        userId = (session?.user as any)?.dbId;
    }

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docs = await db.getReadmesByUser(userId);

    // Optional search query
    const q = request.nextUrl.searchParams.get('q')?.toLowerCase();
    if (q) {
        const filtered = docs.filter(d => {
            const title = (d.title || '').toLowerCase();
            const folder = (d.folder || '').toLowerCase();
            const slug = (d.slug || '').toLowerCase();
            return title.includes(q) || folder.includes(q) || slug.includes(q);
        });
        return NextResponse.json(filtered);
    }

    return NextResponse.json(docs);
}

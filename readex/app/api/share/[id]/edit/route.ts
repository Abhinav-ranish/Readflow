import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    // Support both session cookies and Bearer token auth
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
        const session = await auth();
        userId = (session?.user as any)?.dbId;
    }
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content, title } = await request.json();

    if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const updated = await db.updateReadme(id, content, userId, title);
    if (!updated) {
        return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
}

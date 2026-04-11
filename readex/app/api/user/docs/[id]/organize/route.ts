import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if ('folder' in body) {
        const folder = body.folder === null || body.folder === '' ? null : String(body.folder).slice(0, 50);
        const ok = await db.setDocFolder(id, userId, folder);
        if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if ('pinned' in body) {
        const ok = await db.setDocPinned(id, userId, !!body.pinned);
        if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}

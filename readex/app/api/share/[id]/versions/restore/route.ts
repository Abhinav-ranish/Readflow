import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const updated = await db.updateReadme(id, content, userId);
    if (!updated) {
        return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
}

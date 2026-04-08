import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await db.deleteReadme(id, userId);
    if (!deleted) {
        return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
}

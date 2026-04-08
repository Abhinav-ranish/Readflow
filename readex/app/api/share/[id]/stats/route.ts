import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const entry = await db.getReadme(id);
    if (!entry || entry.userId !== userId) {
        return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 });
    }

    const stats = await db.getViewStats(id);
    return NextResponse.json(stats);
}

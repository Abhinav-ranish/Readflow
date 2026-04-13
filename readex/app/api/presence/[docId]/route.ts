import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// POST /api/presence/[docId] — heartbeat (send every 30s)
export async function POST(request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
    const { docId } = await params;
    const session = await auth();
    const user = session?.user as any;
    if (!user?.dbId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await db.setPresence(docId, user.dbId, user.name || 'Anonymous', user.image);
    return NextResponse.json({ ok: true });
}

// GET /api/presence/[docId] — who's viewing
export async function GET(_request: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
    const { docId } = await params;
    const viewers = await db.getPresence(docId);
    return NextResponse.json(viewers);
}

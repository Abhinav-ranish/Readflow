import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

function isAdmin(email?: string | null): boolean {
    if (!email) return false;
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return admins.includes(email.toLowerCase());
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const entry = await db.getReadme(id);
    if (!entry || (entry.userId !== userId && !isAdmin(session?.user?.email))) {
        return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 });
    }

    const versions = await db.getVersions(id);
    return NextResponse.json(versions);
}

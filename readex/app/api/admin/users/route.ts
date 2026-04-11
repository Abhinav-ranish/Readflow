import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getAdminEmails(): string[] {
    const raw = process.env.ADMIN_EMAILS || '';
    return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

// DELETE a user
export async function DELETE(request: NextRequest) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || !getAdminEmails().includes(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const ok = await db.adminDeleteUser(id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

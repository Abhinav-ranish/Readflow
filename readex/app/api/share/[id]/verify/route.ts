import { NextRequest, NextResponse } from 'next/server';
import { db, verifyPassword } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
        return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const entry = await db.getReadme(id);
    if (!entry || !entry.passwordHash) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const valid = await verifyPassword(password, entry.passwordHash);
    if (!valid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
}

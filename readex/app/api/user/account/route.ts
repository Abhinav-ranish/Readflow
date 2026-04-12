import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET user profile info
export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.getUser(userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        provider: user.provider,
        plan: user.plan || 'free',
        createdAt: user.createdAt,
    });
}

// DELETE account and all documents
export async function DELETE() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ok = await db.deleteAccountAndDocs(userId);
    if (!ok) {
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

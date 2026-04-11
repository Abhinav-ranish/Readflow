import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function isAdmin(email?: string | null): boolean {
    if (!email) return false;
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return admins.includes(email.toLowerCase());
}

// GET a single doc's full content (admin only)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!isAdmin(session?.user?.email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const entry = await db.getReadme(id);
    if (!entry) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
        id,
        content: entry.content,
        title: entry.title,
        slug: entry.slug,
        userId: entry.userId,
        createdAt: entry.createdAt,
    });
}

// PUT to update content (admin only, no ownership check)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!isAdmin(session?.user?.email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { content, title } = await request.json();
    if (!content || typeof content !== 'string') {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    const updated = await db.adminUpdateContent(id, content, title);
    if (!updated) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}

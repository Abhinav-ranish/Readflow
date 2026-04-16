import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getAdminEmails(): string[] {
    const raw = process.env.ADMIN_EMAILS || '';
    return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

async function verifyAdmin() {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || !getAdminEmails().includes(email)) return null;
    return email;
}

// DELETE a doc (no ownership check)
export async function DELETE(request: NextRequest) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const ok = await db.adminDeleteDoc(id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// PATCH a doc (slug, title)
export async function PATCH(request: NextRequest) {
    if (!await verifyAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id, slug, title, userId, projectId } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (userId !== undefined) {
        await db.adminReassignDoc(id, userId);
    }

    if (projectId !== undefined) {
        await db.adminSetDocProject(id, projectId);
    }

    if (slug !== undefined) {
        if (slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
        }
        const ok = await db.adminSetSlug(id, slug || null);
        if (!ok) return NextResponse.json({ error: 'Slug taken or doc not found' }, { status: 409 });
    }

    if (title !== undefined) {
        await db.adminSetTitle(id, title);
    }

    return NextResponse.json({ ok: true });
}

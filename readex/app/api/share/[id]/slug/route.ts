import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { slug } = await request.json();

    if (!slug || typeof slug !== 'string') {
        return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const normalized = slug.toLowerCase().trim();
    if (!SLUG_REGEX.test(normalized)) {
        return NextResponse.json({ error: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only' }, { status: 400 });
    }

    const success = await db.setSlug(id, normalized, userId);
    if (!success) {
        return NextResponse.json({ error: 'Slug already taken or not authorized' }, { status: 409 });
    }

    return NextResponse.json({ ok: true, slug: normalized });
}

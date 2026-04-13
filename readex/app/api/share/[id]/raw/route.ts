import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const entry = await db.getReadme(id);

    if (!entry) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return NextResponse.json({ error: 'Document has expired' }, { status: 410 });
    }

    if (entry.passwordHash) {
        const pw = request.nextUrl.searchParams.get('password');
        if (!pw) {
            return NextResponse.json({ error: 'Password required', protected: true }, { status: 401 });
        }
        const valid = await verifyPassword(pw, entry.passwordHash);
        if (!valid) {
            return NextResponse.json({ error: 'Incorrect password', protected: true }, { status: 403 });
        }
    }

    const format = request.nextUrl.searchParams.get('format');

    if (format === 'json') {
        return NextResponse.json({
            id,
            title: entry.title,
            content: entry.content,
            createdAt: entry.createdAt,
            slug: entry.slug,
        });
    }

    // Default: return raw markdown
    return new NextResponse(entry.content, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${(entry.title || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}.md"`,
        },
    });
}

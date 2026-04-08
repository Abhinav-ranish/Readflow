import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const comments = await db.getComments(id);
    return NextResponse.json(comments);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { content, authorName } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const cleanContent = content.trim().slice(0, 2000);

    let userId: string | undefined;
    let name = (typeof authorName === 'string' && authorName.trim()) ? authorName.trim().slice(0, 50) : 'Anonymous';
    try {
        const session = await auth();
        if (session?.user) {
            userId = (session.user as any)?.dbId;
            name = session.user.name || name;
        }
    } catch { /* not authenticated */ }

    const commentId = await db.addComment(id, name, cleanContent, userId);
    return NextResponse.json({ id: commentId });
}

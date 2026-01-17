import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content } = body;

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        const id = await db.saveReadme(content);

        // Construct absolute URL
        const url = new URL(request.url);
        const origin = url.origin;
        const shareUrl = `${origin}/s/${id}`;

        return NextResponse.json({ id, url: shareUrl });
    } catch (error) {
        console.error('Share Error:', error);
        return NextResponse.json({ error: 'Failed to share' }, { status: 500 });
    }
}

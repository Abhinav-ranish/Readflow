import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST — verify an API token and return the associated user info
export async function POST(request: NextRequest) {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const user = await db.getUserByApiKey(token);
    if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({ email: user.email, name: user.name });
}

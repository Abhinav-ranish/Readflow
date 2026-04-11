import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// Simple in-memory rate limit: 1 generation per user per 5 minutes
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000;

// POST — generate (or rotate) an agent token. Only one active token per user.
export async function POST() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit
    const lastGen = rateLimitMap.get(userId) || 0;
    if (Date.now() - lastGen < RATE_LIMIT_MS) {
        const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastGen)) / 1000);
        return NextResponse.json({ error: `Please wait ${waitSec}s before generating a new token` }, { status: 429 });
    }

    const apiKey = `rf_${randomBytes(24).toString('hex')}`;
    await db.setApiKey(userId, apiKey);
    rateLimitMap.set(userId, Date.now());

    return NextResponse.json({ apiKey });
}

// GET — check if user has an agent token (returns masked version)
export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.getUser(userId);
    const apiKey = (user as any)?.apiKey;

    if (!apiKey) return NextResponse.json({ hasKey: false });
    return NextResponse.json({ hasKey: true, masked: apiKey.slice(0, 7) + '...' + apiKey.slice(-4) });
}

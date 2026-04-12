import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getAdminEmails(): string[] {
    const raw = process.env.ADMIN_EMAILS || '';
    return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

// In-memory cache: one stats snapshot per 5 minutes
let cachedStats: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!getAdminEmails().includes(email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = Date.now();
    if (cachedStats && now - cacheTime < CACHE_TTL) {
        return NextResponse.json(cachedStats);
    }

    const stats = await db.getAdminStats();
    cachedStats = stats;
    cacheTime = now;

    return NextResponse.json(stats);
}

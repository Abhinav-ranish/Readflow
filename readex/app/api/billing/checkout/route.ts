import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCheckoutSession, isValidBypassCode } from '@/lib/billing';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId || !session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for bypass code
    const body = await request.json().catch(() => ({}));
    if (body.bypassCode && isValidBypassCode(body.bypassCode)) {
        // Activate pro via bypass
        await db.setUserPlan(userId, 'pro');
        return NextResponse.json({ ok: true, bypassed: true });
    }

    const url = await createCheckoutSession(userId, session.user.email);
    if (!url) {
        return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
    }

    return NextResponse.json({ url });
}

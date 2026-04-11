import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createPortalSession } from '@/lib/billing';
import { db } from '@/lib/db';

export async function POST() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.getUser(userId);
    const customerId = (user as any)?.stripeCustomerId;
    if (!customerId) {
        return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const url = await createPortalSession(customerId);
    if (!url) {
        return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
    }

    return NextResponse.json({ url });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanLimits } from '@/lib/billing';
import type { PlanTier } from '@/lib/billing';

export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.getUser(userId);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tier: PlanTier = (user as any).plan || 'free';
    const limits = getPlanLimits(tier);
    const aiCreditsUsed = (user as any).aiCreditsUsed || 0;

    return NextResponse.json({
        tier,
        limits,
        aiCreditsUsed,
        aiCreditsRemaining: limits.aiCredits - aiCreditsUsed,
    });
}

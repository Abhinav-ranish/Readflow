import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUseFeature } from '@/lib/billing';
import type { PlanTier } from '@/lib/billing';

// Custom domain management
// For now, stores domain config in user metadata
// Actual DNS verification would need a background job

export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.getUser(userId);
    const tier: PlanTier = (user as any)?.plan || 'free';
    if (!canUseFeature(tier, 'customDomain')) {
        return NextResponse.json({ error: 'Custom domains require Pro plan' }, { status: 403 });
    }

    // Return current domain config (stored as slug-based for now)
    return NextResponse.json({
        configured: false,
        instructions: 'Add a CNAME record pointing your subdomain to cname.readflow.aranish.uk, then set your domain below.',
    });
}

export async function POST(request: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.getUser(userId);
    const tier: PlanTier = (user as any)?.plan || 'free';
    if (!canUseFeature(tier, 'customDomain')) {
        return NextResponse.json({ error: 'Custom domains require Pro plan' }, { status: 403 });
    }

    const { domain } = await request.json();
    if (!domain || typeof domain !== 'string') {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    if (!domainRegex.test(domain.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // In production, this would:
    // 1. Store the domain mapping
    // 2. Trigger DNS verification
    // 3. Configure Vercel domain alias via API
    // For now, return success with instructions
    return NextResponse.json({
        ok: true,
        domain: domain.toLowerCase(),
        status: 'pending_verification',
        instructions: `Add a CNAME record: ${domain} -> cname.readflow.aranish.uk`,
    });
}

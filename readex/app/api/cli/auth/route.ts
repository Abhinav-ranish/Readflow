import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// In-memory store for pending CLI auth codes
// code -> { createdAt, token?, email?, status }
const pendingCodes = new Map<string, { createdAt: number; token?: string; email?: string; status: 'pending' | 'approved' | 'expired' }>();

// Clean up old codes every 5 min
setInterval(() => {
    const now = Date.now();
    for (const [code, data] of pendingCodes) {
        if (now - data.createdAt > 10 * 60 * 1000) pendingCodes.delete(code);
    }
}, 5 * 60 * 1000);

// POST — create a new auth code (called by CLI)
// or approve a code (called by web app)
export async function POST(request: NextRequest) {
    const body = await request.json();

    // CLI requesting a new code
    if (body.action === 'create') {
        const code = randomBytes(4).toString('hex'); // 8-char hex code
        pendingCodes.set(code, { createdAt: Date.now(), status: 'pending' });
        return NextResponse.json({ code, expiresIn: 600 });
    }

    // Web app approving a code
    if (body.action === 'approve' && body.code) {
        const session = await auth();
        const userId = (session?.user as any)?.dbId;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const pending = pendingCodes.get(body.code);
        if (!pending || pending.status !== 'pending') {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        // Generate token for this user
        const apiKey = `rf_${randomBytes(24).toString('hex')}`;
        await db.setApiKey(userId, apiKey);

        pending.token = apiKey;
        pending.email = session?.user?.email || undefined;
        pending.status = 'approved';

        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// GET — poll for code status (called by CLI)
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const pending = pendingCodes.get(code);
    if (!pending) return NextResponse.json({ status: 'expired' });

    if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
        pendingCodes.delete(code);
        return NextResponse.json({ status: 'expired' });
    }

    if (pending.status === 'approved') {
        const result = { status: 'approved', token: pending.token, email: pending.email };
        pendingCodes.delete(code); // One-time use
        return NextResponse.json(result);
    }

    return NextResponse.json({ status: 'pending' });
}

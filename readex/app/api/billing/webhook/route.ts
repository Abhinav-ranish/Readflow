import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Verify Stripe signature
async function verifyStripeSignature(body: string, signature: string): Promise<boolean> {
    if (!STRIPE_WEBHOOK_SECRET) return false;

    const parts = signature.split(',').reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    const timestamp = parts['t'];
    const sig = parts['v1'];
    if (!timestamp || !sig) return false;

    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(STRIPE_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');

    return expected === sig;
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !await verifyStripeSignature(body, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.metadata?.userId || session.client_reference_id;
            if (userId) {
                await db.setUserPlan(userId, 'pro', session.customer, session.subscription);
            }
            break;
        }
        case 'customer.subscription.deleted':
        case 'customer.subscription.updated': {
            const sub = event.data.object;
            const status = sub.status;
            // Find user by stripe customer ID and downgrade if cancelled
            if (status === 'canceled' || status === 'unpaid') {
                const userId = sub.metadata?.userId;
                if (userId) {
                    await db.setUserPlan(userId, 'free');
                }
            }
            break;
        }
    }

    return NextResponse.json({ received: true });
}

// Billing & subscription logic
// Supports Stripe subscriptions + env-based bypass codes

export type PlanTier = 'free' | 'pro';

export interface UserPlan {
    tier: PlanTier;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    aiCreditsUsed: number;
    aiCreditsLimit: number;
}

// Env bypass codes: comma-separated list in BILLING_BYPASS_CODES
function getBypassCodes(): string[] {
    const raw = process.env.BILLING_BYPASS_CODES || '';
    return raw.split(',').map(c => c.trim()).filter(Boolean);
}

export function isValidBypassCode(code: string): boolean {
    return getBypassCodes().includes(code.trim());
}

// Plan limits
const PLAN_LIMITS = {
    free: {
        maxDocs: Infinity,
        aiCredits: 0,
        analytics: true,
        customSlugs: true,
        customDomain: false,
        passwordShares: true,
        expiringLinks: true,
    },
    pro: {
        maxDocs: Infinity,
        aiCredits: 200,
        analytics: true,
        customSlugs: true,
        customDomain: true,
        passwordShares: true,
        expiringLinks: true,
    },
} as const;

export function getPlanLimits(tier: PlanTier) {
    return PLAN_LIMITS[tier];
}

export function canUseFeature(tier: PlanTier, feature: keyof typeof PLAN_LIMITS.pro): boolean {
    const limits = PLAN_LIMITS[tier];
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
}

// Stripe helpers
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const APP_URL = process.env.NEXTAUTH_URL || 'https://readflow.aranish.uk';

export async function createCheckoutSession(userId: string, email: string): Promise<string | null> {
    if (!STRIPE_SECRET || !STRIPE_PRICE_ID) return null;

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${STRIPE_SECRET}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'mode': 'subscription',
            'line_items[0][price]': STRIPE_PRICE_ID,
            'line_items[0][quantity]': '1',
            'success_url': `${APP_URL}/dashboard?upgraded=true`,
            'cancel_url': `${APP_URL}/dashboard`,
            'customer_email': email,
            'client_reference_id': userId,
            'metadata[userId]': userId,
        }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
}

export async function createPortalSession(customerId: string): Promise<string | null> {
    if (!STRIPE_SECRET) return null;

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${STRIPE_SECRET}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'customer': customerId,
            'return_url': `${APP_URL}/dashboard`,
        }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
}

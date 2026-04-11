import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

function getAdminEmails(): string[] {
    const raw = process.env.ADMIN_EMAILS || '';
    return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export async function GET() {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admins = getAdminEmails();
    if (!admins.includes(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users, docs] = await Promise.all([
        db.getAllUsers(),
        db.getAllDocs(),
    ]);

    return NextResponse.json({ users, docs });
}

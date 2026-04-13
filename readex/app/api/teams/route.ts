import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

async function getUserId(request: NextRequest): Promise<string | undefined> {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const keyUser = await db.getUserByApiKey(authHeader.slice(7).trim());
        if (keyUser) return keyUser.id;
    }
    const session = await auth();
    return (session?.user as any)?.dbId;
}

// GET /api/teams — list user's teams
export async function GET(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const teams = await db.getTeamsByUser(userId);
    return NextResponse.json(teams);
}

// POST /api/teams — create a team
export async function POST(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name || name.length > 100) return NextResponse.json({ error: 'Name required (max 100 chars)' }, { status: 400 });
    const teamId = await db.createTeam(name, userId);
    return NextResponse.json({ id: teamId, name });
}

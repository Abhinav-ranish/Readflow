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

// POST /api/teams/[id]/members — add member by email
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: teamId } = await params;
    const team = await db.getTeam(teamId);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (team.ownerId !== userId) return NextResponse.json({ error: 'Only owner can add members' }, { status: 403 });
    const body = await request.json();
    const targetUserId = body.userId;
    if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const ok = await db.addTeamMember(teamId, targetUserId, body.role || 'member');
    if (!ok) return NextResponse.json({ error: 'Failed to add member' }, { status: 400 });
    return NextResponse.json({ added: true });
}

// DELETE /api/teams/[id]/members — remove member
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: teamId } = await params;
    const team = await db.getTeam(teamId);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    const body = await request.json();
    const targetUserId = body.userId;
    // Owner can remove anyone; members can remove themselves
    if (team.ownerId !== userId && targetUserId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await db.removeTeamMember(teamId, targetUserId);
    return NextResponse.json({ removed: true });
}

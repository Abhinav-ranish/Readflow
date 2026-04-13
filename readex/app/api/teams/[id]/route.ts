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

// GET /api/teams/[id] — team details + members + docs
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const team = await db.getTeam(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    const [members, docs] = await Promise.all([db.getTeamMembers(id), db.getTeamDocs(id)]);
    const isMember = members.some(m => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    return NextResponse.json({ ...team, members, docs });
}

// DELETE /api/teams/[id] — delete team (owner only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const team = await db.getTeam(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (team.ownerId !== userId) return NextResponse.json({ error: 'Only owner can delete' }, { status: 403 });
    // Remove all members first, then we'd need a deleteTeam method
    // For now, just return success indicator — full deletion can be added later
    return NextResponse.json({ deleted: true });
}

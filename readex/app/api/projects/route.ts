import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/projects — list user's projects
export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const projects = await db.getProjectsByUser(userId);

    // Attach doc counts
    const results = await Promise.all(
        projects.map(async (p) => {
            const docs = await db.getProjectDocs(p.id);
            return { ...p, docCount: docs.length };
        })
    );

    return NextResponse.json(results);
}

// POST /api/projects — create a project
export async function POST(request: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, icon, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 100) {
        return NextResponse.json({ error: 'Name must be under 100 characters' }, { status: 400 });
    }

    const id = await db.createProject(name.trim(), userId, {
        description: description?.slice(0, 500),
        icon: icon?.slice(0, 10),
        color: color?.slice(0, 20),
    });

    return NextResponse.json({ id, name: name.trim() });
}

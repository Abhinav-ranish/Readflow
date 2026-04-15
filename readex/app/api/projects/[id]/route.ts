import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/projects/[id] — get a single project
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await db.getProject(id);
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (project.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const docs = await db.getProjectDocs(id);
    return NextResponse.json({ ...project, docCount: docs.length });
}

// PUT /api/projects/[id] — update a project
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const updates: { name?: string; description?: string; icon?: string; color?: string } = {};

    if (body.name !== undefined) updates.name = String(body.name).slice(0, 100);
    if (body.description !== undefined) updates.description = String(body.description).slice(0, 500);
    if (body.icon !== undefined) updates.icon = String(body.icon).slice(0, 10);
    if (body.color !== undefined) updates.color = String(body.color).slice(0, 20);

    const ok = await db.updateProject(id, userId, updates);
    if (!ok) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });

    return NextResponse.json({ ok: true });
}

// DELETE /api/projects/[id] — delete a project
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ok = await db.deleteProject(id, userId);
    if (!ok) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });

    return NextResponse.json({ ok: true });
}

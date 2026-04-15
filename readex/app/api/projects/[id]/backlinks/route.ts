import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/projects/[id]/backlinks?docId=xxx — get backlinks for a doc in a project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    const docId = request.nextUrl.searchParams.get('docId');
    if (!docId) return NextResponse.json({ error: 'docId param is required' }, { status: 400 });

    const project = await db.getProject(projectId);
    if (!project || project.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const backlinks = await db.getBacklinks(docId, projectId);
    return NextResponse.json(backlinks);
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/projects/[id]/graph — get graph data for a project
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await db.getProject(id);
    if (!project || project.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [docs, links] = await Promise.all([
        db.getProjectDocs(id),
        db.getProjectGraph(id),
    ]);

    // Build link count per doc
    const linkCounts: Record<string, number> = {};
    for (const link of links) {
        linkCounts[link.sourceId] = (linkCounts[link.sourceId] || 0) + 1;
        linkCounts[link.targetId] = (linkCounts[link.targetId] || 0) + 1;
    }

    const nodes = docs.map(d => ({
        id: d.id,
        title: d.title || 'Untitled',
        linkCount: linkCounts[d.id] || 0,
    }));

    const edges = links.map(l => ({
        source: l.sourceId,
        target: l.targetId,
        label: l.linkText,
    }));

    return NextResponse.json({ nodes, edges });
}

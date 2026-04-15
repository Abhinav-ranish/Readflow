import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseWikiLinks, resolveWikiLinks } from '@/lib/wikilinks';

// GET /api/projects/[id]/docs — list docs in a project
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

    const docs = await db.getProjectDocs(id);
    return NextResponse.json(docs);
}

// POST /api/projects/[id]/docs — add or remove a doc from a project
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = (session?.user as any)?.dbId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    const project = await db.getProject(projectId);
    if (!project || project.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { docId, action } = body;

    if (!docId || typeof docId !== 'string') {
        return NextResponse.json({ error: 'docId is required' }, { status: 400 });
    }

    if (action === 'remove') {
        const ok = await db.setDocProject(docId, userId, null);
        if (!ok) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
        return NextResponse.json({ ok: true });
    }

    // Default: add doc to project
    const ok = await db.setDocProject(docId, userId, projectId);
    if (!ok) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });

    // Parse wiki-links and save doc links
    const readme = await db.getReadme(docId);
    if (readme?.content) {
        const projectDocs = await db.getProjectDocs(projectId);
        const titleMap = new Map<string, { id: string; title: string }>();
        for (const d of projectDocs) {
            if (d.title) titleMap.set(d.title, { id: d.id, title: d.title });
        }
        const links = resolveWikiLinks(readme.content, titleMap);
        if (links.length > 0) {
            await db.saveDocLinks(docId, projectId, links);
        }
    }

    return NextResponse.json({ ok: true });
}

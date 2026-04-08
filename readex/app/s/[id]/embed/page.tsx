import { db } from '@/lib/db';
import Preview from '@/components/Preview';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EmbedPage({ params }: Props) {
    const { id } = await params;
    const entry = await db.getReadme(id);
    if (!entry) notFound();

    return (
        <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
            <Preview content={entry.content} />
        </div>
    );
}

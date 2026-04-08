import React from 'react';
import { db } from '@/lib/db';
import Preview from '@/components/Preview';
import DownloadButtons from '@/components/DownloadButtons';
import styles from './page.module.css';
import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ id: string }>;
}

function extractPlainText(markdown: string): string {
    const lines = markdown.split('\n');
    const parts: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '---') continue;
        if (/^```/.test(trimmed)) continue;
        // Skip headings for description — the title already covers it
        if (/^#{1,6}\s+/.test(trimmed)) continue;

        // Clean metadata lines: **Key:** Value → Key: Value
        const metaMatch = trimmed.match(/^\*\*([^*]+?):\*\*\s*(.+)/);
        if (metaMatch) {
            parts.push(`${metaMatch[1].trim()}: ${metaMatch[2].replace(/[*_~`]/g, '').trim()}`);
            continue;
        }

        // Clean regular lines
        const cleaned = trimmed
            .replace(/[*_~`>]/g, '')
            .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
            .trim();
        if (cleaned) parts.push(cleaned);
    }

    return parts.join(' · ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const entry = await db.getReadme(id);

    if (!entry) {
        return { title: 'Not Found — Readflow' };
    }

    const { content, title } = entry;
    const plainText = extractPlainText(content);
    const description = plainText.length > 155
        ? plainText.slice(0, 155) + '...'
        : plainText;

    const pageTitle = title
        ? `${title} — Readflow`
        : 'Shared Document — Readflow';

    return {
        title: pageTitle,
        description,
        openGraph: {
            title: title || 'Shared Document',
            description,
            siteName: 'Readflow',
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: title || 'Shared Document',
            description,
        },
    };
}

export default async function SharedReadmePage({ params }: Props) {
    const { id } = await params;

    const entry = await db.getReadme(id);

    if (!entry) {
        notFound();
    }

    const { content, title } = entry;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.branding}>
                    <Link href="/" className={styles.logoLink}>
                        <span className={styles.logoIcon}>R</span>
                        <span className={styles.logoText}>Readflow</span>
                    </Link>
                    <div className={styles.separator}>/</div>
                    {title ? (
                        <span className={styles.docTitle}>{title}</span>
                    ) : (
                        <div className={styles.badge}>
                            <Lock size={14} />
                            <span>Read Only</span>
                        </div>
                    )}
                </div>
                <div className={styles.actions}>
                    <DownloadButtons content={content} title={title} />
                    <Link href="/" className={styles.createLink}>
                        Create New
                    </Link>
                </div>
            </header>
            <main className={styles.main}>
                <div data-preview-content>
                    <Preview content={content} />
                </div>
            </main>
        </div>
    );
}

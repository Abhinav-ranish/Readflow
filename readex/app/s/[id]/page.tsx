import React from 'react';
import { db } from '@/lib/db';
import Preview from '@/components/Preview';
import ForkButton from '@/components/ForkButton';
import DownloadMenu from '@/components/DownloadMenu';
import PoweredByFooter from '@/components/PoweredByFooter';
import CommentSection from '@/components/CommentSection';
import SharedPageClient from './SharedPageClient';
import styles from './page.module.css';
import { notFound } from 'next/navigation';
import { Lock, Clock, Pencil, History } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

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
        if (/^#{1,6}\s+/.test(trimmed)) continue;

        const metaMatch = trimmed.match(/^\*\*([^*]+?):\*\*\s*(.+)/);
        if (metaMatch) {
            parts.push(`${metaMatch[1].trim()}: ${metaMatch[2].replace(/[*_~`]/g, '').trim()}`);
            continue;
        }

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
        other: {
            'script:ld+json': JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: title || 'Shared Document',
                description,
                datePublished: entry.createdAt ? new Date(entry.createdAt).toISOString() : undefined,
                publisher: {
                    '@type': 'Organization',
                    name: 'Readflow',
                    url: 'https://readflow.aranish.uk',
                },
            }),
        },
    };
}

export default async function SharedReadmePage({ params }: Props) {
    const { id } = await params;

    const entry = await db.getReadme(id);

    if (!entry) {
        notFound();
    }

    // Record view
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const referrer = headersList.get('referer') || undefined;
    db.recordView(id, ip, referrer).catch(() => {});

    const { content, title, createdAt, passwordHash, expiresAt, userId } = entry;
    const isProtected = !!passwordHash;
    const timeAgo = createdAt ? formatTimeAgo(createdAt) : null;
    const viewCount = await db.getViewCount(id);

    const session = await auth();
    const currentUserId = (session?.user as any)?.dbId;
    const isOwner = !!(currentUserId && userId && currentUserId === userId);

    // If password-protected, render client component that handles unlock
    if (isProtected) {
        return (
            <SharedPageClient
                docId={id}
                content={content}
                title={title}
                createdAt={createdAt}
                expiresAt={expiresAt}
                isProtected={true}
                viewCount={viewCount}
                isOwner={isOwner}
            />
        );
    }

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
                    {timeAgo && (
                        <div className={styles.timeBadge}>
                            <Clock size={12} />
                            <span>{timeAgo}</span>
                        </div>
                    )}
                    {viewCount > 0 && (
                        <div className={styles.timeBadge}>
                            <span>{viewCount} view{viewCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
                <div className={styles.actions}>
                    {isOwner && (
                        <>
                            <Link href={`/s/${id}/edit`} className={styles.createLink} title="Edit">
                                <Pencil size={14} />
                            </Link>
                            <Link href={`/s/${id}/versions`} className={styles.createLink} title="Version History">
                                <History size={14} />
                            </Link>
                        </>
                    )}
                    <ForkButton content={content} />
                    <DownloadMenu content={content} title={title} />
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
            <CommentSection docId={id} />
            <PoweredByFooter />
        </div>
    );
}

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

'use client';
import React, { useState, useEffect } from 'react';
import Preview from '@/components/Preview';
import ForkButton from '@/components/ForkButton';
import DownloadMenu from '@/components/DownloadMenu';
import PoweredByFooter from '@/components/PoweredByFooter';
import CommentSection from '@/components/CommentSection';
import PasswordGate from '@/components/PasswordGate';
import PresenceIndicator from '@/components/PresenceIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import { Lock, Clock, Pencil, History } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

interface SharedPageClientProps {
    docId: string;
    content: string;
    title?: string;
    createdAt?: number;
    expiresAt?: number;
    isProtected: boolean;
    viewCount: number;
    isOwner?: boolean;
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

export default function SharedPageClient({ docId, content, title, createdAt, isProtected, viewCount, isOwner }: SharedPageClientProps) {
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        if (isProtected && sessionStorage.getItem(`rf_unlock_${docId}`)) {
            setUnlocked(true);
        }
    }, [docId, isProtected]);

    if (isProtected && !unlocked) {
        return <PasswordGate docId={docId} onUnlock={() => setUnlocked(true)} />;
    }

    const timeAgo = createdAt ? formatTimeAgo(createdAt) : null;

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
                    <ThemeToggle />
                    <PresenceIndicator docId={docId} />
                    {isOwner && (
                        <>
                            <Link href={`/s/${docId}/edit`} className={styles.createLink} title="Edit">
                                <Pencil size={14} />
                            </Link>
                            <Link href={`/s/${docId}/versions`} className={styles.createLink} title="Version History">
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
            <CommentSection docId={docId} />
            <PoweredByFooter />
        </div>
    );
}

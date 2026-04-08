'use client';
import React from 'react';
import { Share2, Link2 } from 'lucide-react';
import Link from 'next/link';
import styles from './TopBar.module.css';

interface TopBarProps {
    onShare: () => void;
    isSharing: boolean;
    error?: string | null;
    lastShareUrl?: string;
    onShowLastLink?: () => void;
    templateSelector?: React.ReactNode;
}

export default function TopBar({ onShare, isSharing, error, lastShareUrl, onShowLastLink, templateSelector }: TopBarProps) {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.logo}>
                <span className={styles.logoIcon}>R</span>
                <span className={styles.logoText}>Readflow</span>
            </Link>
            <div className={styles.actions}>
                {templateSelector}
                {error && <span className={styles.errorToast}>{error}</span>}
                {lastShareUrl && onShowLastLink && (
                    <button
                        className={styles.lastLinkButton}
                        onClick={onShowLastLink}
                        title="View last shared link"
                    >
                        <Link2 size={16} />
                        <span className={styles.lastLinkLabel}>Last link</span>
                    </button>
                )}
                <button
                    className={styles.shareButton}
                    onClick={onShare}
                    disabled={isSharing}
                >
                    <Share2 size={16} className={styles.shareIcon} />
                    {isSharing ? 'Sharing...' : 'Share'}
                </button>
            </div>
        </header>
    );
}

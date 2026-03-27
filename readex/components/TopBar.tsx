'use client';
import React from 'react';
import { Share2 } from 'lucide-react';
import Link from 'next/link';
import styles from './TopBar.module.css';

interface TopBarProps {
    onShare: () => void;
    isSharing: boolean;
    error?: string | null;
}

export default function TopBar({ onShare, isSharing, error }: TopBarProps) {
    return (
        <header className={styles.header}>
            <Link href="/" className={styles.logo}>
                <span className={styles.logoIcon}>R</span>
                <span className={styles.logoText}>Readflow</span>
            </Link>
            <div className={styles.actions}>
                {error && <span className={styles.errorToast}>{error}</span>}
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

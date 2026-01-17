'use client';
import React from 'react';
import { Share2 } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
    onShare: () => void;
    isSharing: boolean;
}

export default function TopBar({ onShare, isSharing }: TopBarProps) {
    return (
        <header className={styles.header}>
            <div className={styles.logo}>
                <span className={styles.logoIcon}>R</span>
                <span className={styles.logoText}>Readex</span>
            </div>
            <button
                className={styles.shareButton}
                onClick={onShare}
                disabled={isSharing}
            >
                <Share2 size={16} className={styles.shareIcon} />
                {isSharing ? 'Sharing...' : 'Share'}
            </button>
        </header>
    );
}

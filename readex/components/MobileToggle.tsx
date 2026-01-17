'use client';
import React from 'react';
import { Eye, FileEdit } from 'lucide-react';
import styles from './MobileToggle.module.css';

interface MobileToggleProps {
    viewMode: 'editor' | 'preview';
    onToggle: () => void;
}

export default function MobileToggle({ viewMode, onToggle }: MobileToggleProps) {
    return (
        <button className={styles.toggleButton} onClick={onToggle} aria-label="Toggle View">
            {viewMode === 'editor' ? (
                <>
                    <Eye size={20} />
                    <span className={styles.label}>Preview</span>
                </>
            ) : (
                <>
                    <FileEdit size={20} />
                    <span className={styles.label}>Edit</span>
                </>
            )}
        </button>
    );
}

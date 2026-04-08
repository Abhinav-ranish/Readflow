'use client';
import React from 'react';
import { PanelLeftClose, PanelRightClose, Columns2 } from 'lucide-react';
import styles from './LayoutToggle.module.css';

export type DesktopLayout = 'split' | 'editor' | 'preview';

interface LayoutToggleProps {
    layout: DesktopLayout;
    onChange: (layout: DesktopLayout) => void;
}

export default function LayoutToggle({ layout, onChange }: LayoutToggleProps) {
    const cycleLeft = () => {
        // Collapse preview (show editor only), or restore split
        onChange(layout === 'editor' ? 'split' : 'editor');
    };

    const cycleRight = () => {
        // Collapse editor (show preview only), or restore split
        onChange(layout === 'preview' ? 'split' : 'preview');
    };

    return (
        <div className={styles.bar}>
            <button
                className={`${styles.btn} ${layout === 'editor' ? styles.active : ''}`}
                onClick={cycleLeft}
                title={layout === 'editor' ? 'Show split view' : 'Editor only'}
                aria-label={layout === 'editor' ? 'Show split view' : 'Editor only'}
            >
                <PanelRightClose size={14} />
            </button>
            <button
                className={`${styles.btn} ${layout === 'split' ? styles.active : ''}`}
                onClick={() => onChange('split')}
                title="Split view"
                aria-label="Split view"
            >
                <Columns2 size={14} />
            </button>
            <button
                className={`${styles.btn} ${layout === 'preview' ? styles.active : ''}`}
                onClick={cycleRight}
                title={layout === 'preview' ? 'Show split view' : 'Preview only'}
                aria-label={layout === 'preview' ? 'Show split view' : 'Preview only'}
            >
                <PanelLeftClose size={14} />
            </button>
        </div>
    );
}

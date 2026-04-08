'use client';
import { useEffect } from 'react';

interface KeyboardShortcutsProps {
    onShare: () => void;
    onToggleView: () => void;
    onCycleLayout?: () => void;
}

export default function KeyboardShortcuts({ onShare, onToggleView, onCycleLayout }: KeyboardShortcutsProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;
            if (!isMod) return;

            // Cmd+Shift+S → Share
            if (e.shiftKey && e.key === 's') {
                e.preventDefault();
                onShare();
                return;
            }

            // Cmd+S → Save (prevent browser save dialog, content auto-saves)
            if (e.key === 's') {
                e.preventDefault();
                return;
            }

            // Cmd+E → Cycle desktop layout (split → editor → preview → split)
            // Falls back to mobile toggle on small screens
            if (e.key === 'e') {
                e.preventDefault();
                if (onCycleLayout && window.innerWidth > 768) {
                    onCycleLayout();
                } else {
                    onToggleView();
                }
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onShare, onToggleView, onCycleLayout]);

    return null;
}

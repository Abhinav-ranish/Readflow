'use client';
import { useEffect } from 'react';

interface KeyboardShortcutsProps {
    onShare: () => void;
    onToggleView: () => void;
}

export default function KeyboardShortcuts({ onShare, onToggleView }: KeyboardShortcutsProps) {
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

            // Cmd+E → Toggle editor/preview
            if (e.key === 'e') {
                e.preventDefault();
                onToggleView();
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onShare, onToggleView]);

    return null;
}

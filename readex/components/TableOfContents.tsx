'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { List, X } from 'lucide-react';
import styles from './TableOfContents.module.css';

interface TocEntry {
    level: number;
    text: string;
    slug: string;
}

function parseHeadings(markdown: string): TocEntry[] {
    const entries: TocEntry[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2].replace(/[*_~`\[\]]/g, '').trim();
            const slug = text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
            entries.push({ level, text, slug });
        }
    }

    return entries;
}

interface TableOfContentsProps {
    content: string;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const headings = useMemo(() => parseHeadings(content), [content]);

    // Close on escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    if (headings.length < 3) return null;

    const minLevel = Math.min(...headings.map(h => h.level));

    const scrollToHeading = (slug: string) => {
        const previewEl = document.querySelector('[data-preview-content]');
        if (!previewEl) return;

        const allHeadings = previewEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const el of allHeadings) {
            const elSlug = (el.textContent || '')
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
            if (elSlug === slug) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setIsOpen(false);
                break;
            }
        }
    };

    return (
        <>
            <button
                className={styles.tocToggle}
                onClick={() => setIsOpen(!isOpen)}
                title="Table of Contents"
                aria-label="Toggle table of contents"
            >
                {isOpen ? <X size={18} /> : <List size={18} />}
            </button>

            {isOpen && (
                <nav className={styles.tocPanel} aria-label="Table of Contents">
                    <h4 className={styles.tocTitle}>Contents</h4>
                    <ul className={styles.tocList}>
                        {headings.map((h, i) => (
                            <li
                                key={i}
                                className={styles.tocItem}
                                style={{ paddingLeft: `${(h.level - minLevel) * 12}px` }}
                            >
                                <button
                                    className={styles.tocLink}
                                    onClick={() => scrollToHeading(h.slug)}
                                >
                                    {h.text}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </>
    );
}

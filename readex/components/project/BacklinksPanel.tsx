'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ArrowUpLeft, FileText } from 'lucide-react';
import styles from './BacklinksPanel.module.css';

interface Backlink {
    sourceId: string;
    title?: string;
    linkText: string;
}

interface BacklinksPanelProps {
    docId: string;
    projectId: string;
}

export default function BacklinksPanel({ docId, projectId }: BacklinksPanelProps) {
    const [backlinks, setBacklinks] = useState<Backlink[]>([]);
    const [expanded, setExpanded] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBacklinks() {
            try {
                const res = await fetch(`/api/projects/${projectId}/backlinks?docId=${docId}`);
                if (res.ok) setBacklinks(await res.json());
            } finally {
                setLoading(false);
            }
        }
        fetchBacklinks();
    }, [docId, projectId]);

    if (loading) return null;
    if (backlinks.length === 0) return null;

    return (
        <div className={styles.panel}>
            <div className={styles.header} onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <ArrowUpLeft size={14} />
                Backlinks
                <span className={styles.count}>{backlinks.length}</span>
            </div>

            {expanded && (
                <div className={styles.list}>
                    {backlinks.map(bl => (
                        <Link
                            key={bl.sourceId}
                            href={`/s/${bl.sourceId}`}
                            className={styles.item}
                        >
                            <FileText size={13} />
                            <span className={styles.itemTitle}>{bl.title || 'Untitled'}</span>
                            <span className={styles.itemContext}>via [[{bl.linkText}]]</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

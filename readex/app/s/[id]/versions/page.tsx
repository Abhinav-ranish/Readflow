'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Preview from '@/components/Preview';
import { History, ArrowLeft, RotateCcw, Eye, EyeOff } from 'lucide-react';
import styles from './versions.module.css';
import LoadingScreen from '@/components/LoadingScreen';

interface Version {
    id: string;
    readmeId: string;
    content: string;
    createdAt: number;
}

function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function VersionsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const docId = params.id as string;

    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Version | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchVersions = useCallback(async () => {
        try {
            const res = await fetch(`/api/share/${docId}/versions`);
            if (res.ok) {
                const data = await res.json();
                setVersions(data);
                if (data.length > 0) setSelected(data[0]);
            }
        } finally {
            setLoading(false);
        }
    }, [docId]);

    useEffect(() => {
        if (status === 'authenticated') fetchVersions();
    }, [status, fetchVersions]);

    const handleRestore = async (version: Version) => {
        if (!confirm('Restore this version? This will update the document and create a new version entry.')) return;
        setRestoring(true);
        try {
            const res = await fetch(`/api/share/${docId}/versions/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: version.content }),
            });
            if (res.ok) {
                await fetchVersions();
            }
        } finally {
            setRestoring(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><LoadingScreen /></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={16} />
                    </Link>
                    <History size={18} />
                    <h1 className={styles.title}>Version History</h1>
                    <span className={styles.count}>{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                </div>
                <button
                    className={styles.previewToggle}
                    onClick={() => setShowPreview(p => !p)}
                >
                    {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
            </header>

            {versions.length === 0 ? (
                <div className={styles.empty}>
                    <History size={36} strokeWidth={1.2} />
                    <p>No version history available.</p>
                </div>
            ) : (
                <div className={styles.layout}>
                    <div className={styles.sidebar}>
                        {versions.map((v, i) => (
                            <button
                                key={v.id}
                                className={`${styles.versionItem} ${selected?.id === v.id ? styles.active : ''}`}
                                onClick={() => setSelected(v)}
                            >
                                <div className={styles.versionLabel}>
                                    {i === 0 ? 'Current' : `Version ${versions.length - i}`}
                                </div>
                                <div className={styles.versionDate}>{formatDate(v.createdAt)}</div>
                                <div className={styles.versionSize}>
                                    {v.content.length.toLocaleString()} chars
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className={styles.content}>
                        {selected && (
                            <>
                                <div className={styles.contentHeader}>
                                    <span className={styles.contentDate}>{formatDate(selected.createdAt)}</span>
                                    {versions.indexOf(selected) !== 0 && (
                                        <button
                                            className={styles.restoreBtn}
                                            onClick={() => handleRestore(selected)}
                                            disabled={restoring}
                                        >
                                            <RotateCcw size={14} />
                                            {restoring ? 'Restoring...' : 'Restore this version'}
                                        </button>
                                    )}
                                </div>
                                {showPreview ? (
                                    <div className={styles.previewWrap}>
                                        <Preview content={selected.content} />
                                    </div>
                                ) : (
                                    <pre className={styles.rawContent}>{selected.content}</pre>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

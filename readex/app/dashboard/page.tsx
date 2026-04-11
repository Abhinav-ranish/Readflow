'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Trash2, ExternalLink, Lock, Clock, Pencil, BarChart3, History, Plus } from 'lucide-react';
import styles from './page.module.css';

interface DocEntry {
    id: string;
    title?: string;
    createdAt: number;
    hasPassword: boolean;
    expiresAt?: number;
    viewCount?: number;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [docs, setDocs] = useState<DocEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchDocs = useCallback(async () => {
        try {
            const res = await fetch('/api/user/docs');
            if (res.ok) {
                const data = await res.json();
                setDocs(data);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') fetchDocs();
    }, [status, fetchDocs]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this document? This cannot be undone.')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/user/docs/${id}`, { method: 'DELETE' });
            if (res.ok) setDocs(prev => prev.filter(d => d.id !== id));
        } finally {
            setDeleting(null);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoIcon}>R</span>
                        <span className={styles.logoText}>Readflow</span>
                    </Link>
                    <span className={styles.sep}>/</span>
                    <h1 className={styles.title}>My Documents</h1>
                </div>
                <Link href="/" className={styles.newBtn}>
                    <Plus size={16} />
                    New Document
                </Link>
            </header>

            {docs.length === 0 ? (
                <div className={styles.empty}>
                    <FileText size={40} strokeWidth={1.2} />
                    <h2>No documents yet</h2>
                    <p>Documents you share while signed in will appear here.</p>
                    <Link href="/" className={styles.emptyBtn}>Create your first document</Link>
                </div>
            ) : (
                <div className={styles.grid}>
                    {docs.map(doc => (
                        <div key={doc.id} className={styles.card}>
                            <div className={styles.cardTop}>
                                <Link href={`/s/${doc.id}`} className={styles.cardTitle}>
                                    {doc.title || 'Untitled'}
                                </Link>
                                <div className={styles.cardBadges}>
                                    {doc.hasPassword && (
                                        <span className={styles.badge}><Lock size={11} /></span>
                                    )}
                                    {doc.expiresAt && (
                                        <span className={styles.badge}><Clock size={11} /></span>
                                    )}
                                </div>
                            </div>
                            <div className={styles.cardMeta}>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className={styles.cardActions}>
                                <Link href={`/s/${doc.id}`} className={styles.cardBtn} title="View">
                                    <ExternalLink size={14} />
                                </Link>
                                <Link href={`/s/${doc.id}/edit`} className={styles.cardBtn} title="Edit">
                                    <Pencil size={14} />
                                </Link>
                                <Link href={`/s/${doc.id}/versions`} className={styles.cardBtn} title="Version History">
                                    <History size={14} />
                                </Link>
                                <Link href={`/s/${doc.id}/analytics`} className={styles.cardBtn} title="Analytics">
                                    <BarChart3 size={14} />
                                </Link>
                                <button
                                    className={`${styles.cardBtn} ${styles.danger}`}
                                    onClick={() => handleDelete(doc.id)}
                                    disabled={deleting === doc.id}
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

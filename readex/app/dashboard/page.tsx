'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Trash2, ExternalLink, Lock, Clock, Pencil, BarChart3, History, Plus, Pin, PinOff, FolderOpen, Sparkles, Crown } from 'lucide-react';
import styles from './page.module.css';

interface DocEntry {
    id: string;
    title?: string;
    createdAt: number;
    hasPassword: boolean;
    expiresAt?: number;
    slug?: string;
    folder?: string;
    pinned?: boolean;
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div className={styles.loading}>Loading...</div></div>}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [docs, setDocs] = useState<DocEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [filter, setFilter] = useState<string | null>(null);
    const [plan, setPlan] = useState<'free' | 'pro'>('free');
    const [upgradeMsg, setUpgradeMsg] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (searchParams.get('upgraded') === 'true') {
            setUpgradeMsg(true);
            setTimeout(() => setUpgradeMsg(false), 5000);
        }
    }, [searchParams]);

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

    const fetchPlan = useCallback(async () => {
        try {
            const res = await fetch('/api/billing/status');
            if (res.ok) {
                const data = await res.json();
                setPlan(data.tier);
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchDocs();
            fetchPlan();
        }
    }, [status, fetchDocs, fetchPlan]);

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

    const handlePin = async (id: string, pinned: boolean) => {
        await fetch(`/api/user/docs/${id}/organize`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned: !pinned }),
        });
        setDocs(prev => prev.map(d => d.id === id ? { ...d, pinned: !pinned } : d)
            .sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return b.createdAt - a.createdAt;
            }));
    };

    const handleFolder = async (id: string) => {
        const folder = prompt('Enter folder name (or leave empty to remove):');
        if (folder === null) return;
        const value = folder.trim() || null;
        await fetch(`/api/user/docs/${id}/organize`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: value }),
        });
        setDocs(prev => prev.map(d => d.id === id ? { ...d, folder: value || undefined } : d));
    };

    const handleUpgrade = async () => {
        const bypassCode = prompt('Enter upgrade code (or leave empty for Stripe checkout):');
        const body: any = {};
        if (bypassCode?.trim()) body.bypassCode = bypassCode.trim();

        const res = await fetch('/api/billing/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.bypassed) {
            setPlan('pro');
            setUpgradeMsg(true);
            setTimeout(() => setUpgradeMsg(false), 3000);
        } else if (data.url) {
            window.location.href = data.url;
        }
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
    }

    if (!session) return null;

    const folders = [...new Set(docs.filter(d => d.folder).map(d => d.folder!))];
    const filtered = filter ? docs.filter(d => d.folder === filter) : docs;

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
                    {plan === 'pro' && <span className={styles.proBadge}><Crown size={11} /> Pro</span>}
                </div>
                <div className={styles.headerRight}>
                    {plan === 'free' && (
                        <button className={styles.upgradeBtn} onClick={handleUpgrade}>
                            <Sparkles size={14} />
                            Upgrade
                        </button>
                    )}
                    <Link href="/" className={styles.newBtn}>
                        <Plus size={16} />
                        New Document
                    </Link>
                </div>
            </header>

            {upgradeMsg && (
                <div className={styles.upgradeSuccess}>
                    Welcome to Pro! All features are now unlocked.
                </div>
            )}

            {folders.length > 0 && (
                <div className={styles.folderBar}>
                    <button
                        className={`${styles.folderTab} ${!filter ? styles.activeTab : ''}`}
                        onClick={() => setFilter(null)}
                    >
                        All
                    </button>
                    {folders.map(f => (
                        <button
                            key={f}
                            className={`${styles.folderTab} ${filter === f ? styles.activeTab : ''}`}
                            onClick={() => setFilter(filter === f ? null : f)}
                        >
                            <FolderOpen size={12} />
                            {f}
                        </button>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className={styles.empty}>
                    <FileText size={40} strokeWidth={1.2} />
                    <h2>No documents yet</h2>
                    <p>Documents you share while signed in will appear here.</p>
                    <Link href="/" className={styles.emptyBtn}>Create your first document</Link>
                </div>
            ) : (
                <div className={styles.grid}>
                    {filtered.map(doc => (
                        <div key={doc.id} className={`${styles.card} ${doc.pinned ? styles.pinned : ''}`}>
                            <div className={styles.cardTop}>
                                <Link href={`/s/${doc.id}`} className={styles.cardTitle}>
                                    {doc.pinned && <Pin size={12} className={styles.pinIcon} />}
                                    {doc.title || 'Untitled'}
                                </Link>
                                <div className={styles.cardBadges}>
                                    {doc.hasPassword && <span className={styles.badge}><Lock size={11} /></span>}
                                    {doc.expiresAt && <span className={styles.badge}><Clock size={11} /></span>}
                                </div>
                            </div>
                            <div className={styles.cardMeta}>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                {doc.folder && <span className={styles.folderLabel}>{doc.folder}</span>}
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
                                <button className={styles.cardBtn} onClick={() => handlePin(doc.id, !!doc.pinned)} title={doc.pinned ? 'Unpin' : 'Pin'}>
                                    {doc.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                </button>
                                <button className={styles.cardBtn} onClick={() => handleFolder(doc.id)} title="Set Folder">
                                    <FolderOpen size={14} />
                                </button>
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

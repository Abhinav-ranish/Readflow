'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Trash2, ExternalLink, Lock, Clock, Pencil, BarChart3, History, Plus, Pin, PinOff, FolderOpen, Sparkles, Crown, Key, Copy, RefreshCw, Shield, Upload } from 'lucide-react';
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
    // PREMIUM DISABLED — everyone is pro for now
    const [plan] = useState<'free' | 'pro'>('pro');
    const [upgradeMsg] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [agentToken, setAgentToken] = useState<string | null>(null);
    const [maskedToken, setMaskedToken] = useState<string | null>(null);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [tokenMsg, setTokenMsg] = useState<string | null>(null);
    const [tokenRevealed, setTokenRevealed] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        // searchParams upgraded check disabled with premium
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

    // PREMIUM DISABLED — skip plan fetch
    // const fetchPlan = useCallback(async () => {
    //     try {
    //         const res = await fetch('/api/billing/status');
    //         if (res.ok) {
    //             const data = await res.json();
    //             setPlan(data.tier);
    //         }
    //     } catch {}
    // }, []);
    const fetchPlan = useCallback(async () => {}, []);

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

    // PREMIUM DISABLED — upgrade flow commented out
    // const handleUpgrade = async () => {
    //     const bypassCode = prompt('Enter upgrade code (or leave empty for Stripe checkout):');
    //     const body: any = {};
    //     if (bypassCode?.trim()) body.bypassCode = bypassCode.trim();
    //
    //     const res = await fetch('/api/billing/checkout', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(body),
    //     });
    //     const data = await res.json();
    //     if (data.bypassed) {
    //         setPlan('pro');
    //         setUpgradeMsg(true);
    //         setTimeout(() => setUpgradeMsg(false), 3000);
    //     } else if (data.url) {
    //         window.location.href = data.url;
    //     }
    // };

    const fetchToken = async () => {
        try {
            const res = await fetch('/api/user/apikey');
            if (res.ok) {
                const data = await res.json();
                if (data.hasKey) setMaskedToken(data.masked);
            }
        } catch {}
    };

    const generateToken = async () => {
        if (agentToken && !confirm('This will replace your current token. Any CLI/agents using the old token will stop working. Continue?')) return;
        setTokenLoading(true);
        setTokenMsg(null);
        try {
            const res = await fetch('/api/user/apikey', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) { setTokenMsg(data.error || 'Failed'); return; }
            setAgentToken(data.apiKey);
            setMaskedToken(data.apiKey.slice(0, 7) + '...' + data.apiKey.slice(-4));
            setTokenRevealed(true);
            setTokenMsg('Token generated! Copy it now — it won\'t be shown again.');
        } catch {
            setTokenMsg('Failed to generate token');
        } finally {
            setTokenLoading(false);
        }
    };

    const copyToken = () => {
        if (agentToken) {
            navigator.clipboard.writeText(agentToken);
            setTokenMsg('Copied!');
            setTimeout(() => setTokenMsg(null), 2000);
        }
    };

    const uploadFiles = async (files: File[]) => {
        const mdFiles = files.filter(f => f.name.endsWith('.md'));
        if (mdFiles.length === 0) {
            setUploadMsg('Only .md files are supported.');
            setTimeout(() => setUploadMsg(null), 3000);
            return;
        }
        if (mdFiles.length > 5) {
            setUploadMsg('Maximum 5 files at a time.');
            setTimeout(() => setUploadMsg(null), 3000);
            return;
        }
        setUploading(true);
        setUploadMsg(`Uploading ${mdFiles.length} file${mdFiles.length > 1 ? 's' : ''}...`);
        let success = 0;
        for (const file of mdFiles) {
            try {
                const content = await file.text();
                const title = file.name.replace(/\.md$/i, '');
                const res = await fetch('/api/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, title }),
                });
                if (res.ok) success++;
            } catch {}
        }
        setUploading(false);
        setUploadMsg(success > 0 ? `Uploaded ${success} file${success > 1 ? 's' : ''}.` : 'Upload failed.');
        if (success > 0) fetchDocs();
        setTimeout(() => setUploadMsg(null), 3000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) uploadFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragging(false);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) uploadFiles(files);
        e.target.value = '';
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
    }

    if (!session) return null;

    const folders = [...new Set(docs.filter(d => d.folder).map(d => d.folder!))];
    const filtered = filter ? docs.filter(d => d.folder === filter) : docs;

    return (
        <div
            className={`${styles.container} ${dragging ? styles.dropActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {dragging && (
                <div className={styles.dropOverlay}>
                    <Upload size={40} strokeWidth={1.5} />
                    <p>Drop .md files here (max 5)</p>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                multiple
                onChange={handleFileInput}
                style={{ display: 'none' }}
            />
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
                    {/* PREMIUM DISABLED — upgrade button hidden
                    {plan === 'free' && (
                        <button className={styles.upgradeBtn} onClick={handleUpgrade}>
                            <Sparkles size={14} />
                            Upgrade
                        </button>
                    )}
                    */}
                    <button className={styles.settingsBtn} onClick={() => { setShowSettings(!showSettings); if (!showSettings) fetchToken(); }} title="Settings">
                        <Key size={14} />
                    </button>
                    <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Upload size={14} />
                        Upload
                    </button>
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

            {showSettings && (
                <div className={styles.settingsPanel}>
                    <div className={styles.settingsHeader}>
                        <Key size={16} />
                        <h3>Agent Token</h3>
                    </div>
                    <p className={styles.settingsDesc}>
                        Use this token to post from the CLI or AI agents. Shares will appear in your dashboard.
                    </p>
                    <div className={styles.tokenRow}>
                        {maskedToken && !tokenRevealed && (
                            <code className={styles.tokenValue}>{maskedToken}</code>
                        )}
                        {agentToken && tokenRevealed && (
                            <>
                                <code className={styles.tokenValue}>{agentToken}</code>
                                <button className={styles.tokenAction} onClick={copyToken} title="Copy"><Copy size={13} /></button>
                            </>
                        )}
                        {!maskedToken && !agentToken && (
                            <span className={styles.tokenNone}>No token generated</span>
                        )}
                    </div>
                    {tokenMsg && <div className={styles.tokenMsg}>{tokenMsg}</div>}
                    <div className={styles.tokenActions}>
                        <button className={styles.tokenGenBtn} onClick={generateToken} disabled={tokenLoading}>
                            <RefreshCw size={13} />
                            {maskedToken ? 'Rotate Token' : 'Generate Token'}
                        </button>
                    </div>
                    <div className={styles.tokenHelp}>
                        <code>npx readflow config --token YOUR_TOKEN</code>
                    </div>
                </div>
            )}

            {uploadMsg && (
                <div className={styles.uploadMsg}>{uploadMsg}</div>
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

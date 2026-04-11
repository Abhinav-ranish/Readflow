'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, FileText, Shield, ArrowLeft, Trash2, Pencil, ExternalLink, Check, X } from 'lucide-react';
import styles from './page.module.css';

interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    provider: string;
    createdAt: number;
    plan?: string;
    aiCreditsUsed?: number;
}

interface Doc {
    id: string;
    title?: string;
    userId?: string;
    createdAt: number;
    slug?: string;
    folder?: string;
    pinned?: boolean;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'users' | 'docs'>('users');
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [slugValue, setSlugValue] = useState('');
    const [editingTitle, setEditingTitle] = useState<string | null>(null);
    const [titleValue, setTitleValue] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        (async () => {
            try {
                const res = await fetch('/api/admin');
                if (res.status === 403) { setError('You do not have admin access.'); return; }
                if (!res.ok) { setError('Failed to load admin data.'); return; }
                const data = await res.json();
                setUsers(data.users);
                setDocs(data.docs);
            } catch {
                setError('Failed to load admin data.');
            } finally {
                setLoading(false);
            }
        })();
    }, [status]);

    const showError = (msg: string) => {
        setActionError(msg);
        setTimeout(() => setActionError(null), 3000);
    };

    const handleDeleteDoc = async (id: string) => {
        if (!confirm('Permanently delete this document and all its versions, comments, and analytics?')) return;
        const res = await fetch('/api/admin/docs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) setDocs(prev => prev.filter(d => d.id !== id));
        else showError('Failed to delete document');
    };

    const handleDeleteUser = async (id: string, email: string) => {
        if (!confirm(`Permanently delete user ${email}? This does NOT delete their documents.`)) return;
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        if (res.ok) setUsers(prev => prev.filter(u => u.id !== id));
        else showError('Failed to delete user');
    };

    const handleSaveSlug = async (id: string) => {
        const slug = slugValue.trim().toLowerCase();
        if (slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            showError('Slug must be lowercase alphanumeric with dashes');
            return;
        }
        const res = await fetch('/api/admin/docs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, slug: slug || null }),
        });
        if (res.ok) {
            setDocs(prev => prev.map(d => d.id === id ? { ...d, slug: slug || undefined } : d));
            setEditingSlug(null);
        } else {
            const data = await res.json().catch(() => ({}));
            showError(data.error || 'Failed to update slug');
        }
    };

    const handleSaveTitle = async (id: string) => {
        const res = await fetch('/api/admin/docs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, title: titleValue }),
        });
        if (res.ok) {
            setDocs(prev => prev.map(d => d.id === id ? { ...d, title: titleValue } : d));
            setEditingTitle(null);
        } else {
            showError('Failed to update title');
        }
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorPage}>
                    <Shield size={40} />
                    <h2>{error}</h2>
                    <Link href="/dashboard" className={styles.backLink}>Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    const userMap = new Map(users.map(u => [u.id, u]));

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                    <Shield size={18} />
                    <h1 className={styles.title}>Admin</h1>
                </div>
                <div className={styles.stats}>
                    <span>{users.length} users</span>
                    <span>{docs.length} docs</span>
                </div>
            </header>

            {actionError && <div className={styles.actionError}>{actionError}</div>}

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === 'users' ? styles.activeTab : ''}`} onClick={() => setTab('users')}>
                    <Users size={14} /> Users
                </button>
                <button className={`${styles.tab} ${tab === 'docs' ? styles.activeTab : ''}`} onClick={() => setTab('docs')}>
                    <FileText size={14} /> Documents
                </button>
            </div>

            {tab === 'users' && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Provider</th>
                                <th>Plan</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className={styles.userCell}>
                                        {u.image && <img src={u.image} alt="" className={styles.avatar} />}
                                        <span>{u.name || 'Unknown'}</span>
                                    </td>
                                    <td>{u.email}</td>
                                    <td><span className={styles.providerBadge}>{u.provider}</span></td>
                                    <td><span className={`${styles.planBadge} ${u.plan === 'pro' ? styles.proPlan : ''}`}>{u.plan || 'free'}</span></td>
                                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button className={styles.dangerBtn} onClick={() => handleDeleteUser(u.id, u.email)} title="Delete user">
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'docs' && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Owner</th>
                                <th>Slug</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map(d => {
                                const owner = d.userId ? userMap.get(d.userId) : null;
                                return (
                                    <tr key={d.id}>
                                        <td>
                                            {editingTitle === d.id ? (
                                                <span className={styles.inlineEdit}>
                                                    <input
                                                        className={styles.inlineInput}
                                                        value={titleValue}
                                                        onChange={e => setTitleValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(d.id); if (e.key === 'Escape') setEditingTitle(null); }}
                                                        autoFocus
                                                    />
                                                    <button className={styles.inlineOk} onClick={() => handleSaveTitle(d.id)}><Check size={12} /></button>
                                                    <button className={styles.inlineCancel} onClick={() => setEditingTitle(null)}><X size={12} /></button>
                                                </span>
                                            ) : (
                                                <span className={styles.editableCell} onClick={() => { setEditingTitle(d.id); setTitleValue(d.title || ''); }}>
                                                    {d.title || 'Untitled'} <Pencil size={10} className={styles.editHint} />
                                                </span>
                                            )}
                                        </td>
                                        <td>{owner?.email || owner?.name || d.userId || 'Anonymous'}</td>
                                        <td>
                                            {editingSlug === d.id ? (
                                                <span className={styles.inlineEdit}>
                                                    <input
                                                        className={styles.inlineInput}
                                                        value={slugValue}
                                                        onChange={e => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveSlug(d.id); if (e.key === 'Escape') setEditingSlug(null); }}
                                                        placeholder="custom-slug"
                                                        autoFocus
                                                    />
                                                    <button className={styles.inlineOk} onClick={() => handleSaveSlug(d.id)}><Check size={12} /></button>
                                                    <button className={styles.inlineCancel} onClick={() => setEditingSlug(null)}><X size={12} /></button>
                                                </span>
                                            ) : (
                                                <span className={styles.editableCell} onClick={() => { setEditingSlug(d.id); setSlugValue(d.slug || ''); }}>
                                                    {d.slug ? <code className={styles.slug}>/p/{d.slug}</code> : <span className={styles.muted}>none</span>}
                                                    <Pencil size={10} className={styles.editHint} />
                                                </span>
                                            )}
                                        </td>
                                        <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                                        <td className={styles.actionCell}>
                                            <Link href={`/s/${d.id}`} className={styles.actionBtn} title="View"><ExternalLink size={13} /></Link>
                                            <Link href={`/s/${d.id}/edit`} className={styles.actionBtn} title="Edit content"><Pencil size={13} /></Link>
                                            <button className={styles.dangerBtn} onClick={() => handleDeleteDoc(d.id)} title="Delete"><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

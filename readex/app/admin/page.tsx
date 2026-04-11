'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, Trash2, Pencil, ExternalLink, Check, X, ChevronRight, FolderOpen, FileText, User as UserIcon } from 'lucide-react';
import styles from './page.module.css';

interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    provider: string;
    createdAt: number;
    plan?: string;
}

interface Doc {
    id: string;
    title?: string;
    userId?: string;
    createdAt: number;
    slug?: string;
    folder?: string;
    pinned?: boolean;
    preview?: string;
}

function DocFileItem({ doc, selected, editingDoc, editTitle, editSlug, setEditTitle, setEditSlug, setEditingDoc, setSelected, handleSaveDoc, handleDeleteDoc, handleDragStart, handleDragEnd }: {
    doc: Doc;
    selected: Set<string>;
    editingDoc: string | null;
    editTitle: string;
    editSlug: string;
    setEditTitle: (v: string) => void;
    setEditSlug: (v: string) => void;
    setEditingDoc: (v: string | null) => void;
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleSaveDoc: (id: string) => void;
    handleDeleteDoc: (id: string) => void;
    handleDragStart: (e: React.DragEvent, id: string) => void;
    handleDragEnd: () => void;
}) {
    // Build preview lines from content
    const previewLines = (doc.preview || '').replace(/[#*`>\-\[\]()!]/g, '').split('\n').filter(l => l.trim()).slice(0, 6);

    return (
        <div
            className={`${styles.finderItem} ${styles.fileItem} ${selected.has(doc.id) ? styles.fileSelected : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, doc.id)}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                    setSelected(prev => {
                        const next = new Set(prev);
                        next.has(doc.id) ? next.delete(doc.id) : next.add(doc.id);
                        return next;
                    });
                } else {
                    setSelected(new Set([doc.id]));
                }
            }}
        >
            {/* Document thumbnail with real preview */}
            <div className={styles.fileThumb}>
                <div className={styles.fileCorner} />
                <div className={styles.filePreview}>
                    {previewLines.length > 0 ? previewLines.map((line, i) => (
                        <span key={i} className={styles.previewLine}>{line}</span>
                    )) : (
                        <div className={styles.fileLines}>
                            <span className={styles.fileLine} style={{ width: '80%' }} />
                            <span className={styles.fileLine} style={{ width: '60%' }} />
                            <span className={styles.fileLine} style={{ width: '90%' }} />
                            <span className={styles.fileLine} style={{ width: '45%' }} />
                            <span className={styles.fileLine} style={{ width: '70%' }} />
                        </div>
                    )}
                </div>
                <span className={styles.fileExt}>.md</span>
            </div>

            {/* Title - editable */}
            {editingDoc === doc.id ? (
                <div className={styles.editForm} onClick={e => e.stopPropagation()}>
                    <input
                        className={styles.editInput}
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Title"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveDoc(doc.id); if (e.key === 'Escape') setEditingDoc(null); }}
                    />
                    <input
                        className={styles.editInput}
                        value={editSlug}
                        onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="slug"
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveDoc(doc.id); if (e.key === 'Escape') setEditingDoc(null); }}
                    />
                    <div className={styles.editBtns}>
                        <button className={styles.editSave} onClick={() => handleSaveDoc(doc.id)}><Check size={12} /></button>
                        <button className={styles.editCancel} onClick={() => setEditingDoc(null)}><X size={12} /></button>
                    </div>
                </div>
            ) : (
                <span className={styles.finderName} title={doc.title || 'Untitled'}>
                    {doc.title || 'Untitled'}
                </span>
            )}

            {doc.slug && editingDoc !== doc.id && (
                <span className={styles.fileSlug}>/p/{doc.slug}</span>
            )}

            <span className={styles.finderMeta}>
                {new Date(doc.createdAt).toLocaleDateString()}
            </span>

            {/* Hover actions */}
            <div className={styles.fileActions} onClick={e => e.stopPropagation()}>
                <a href={`/s/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.fileActionBtn} title="Open in new tab">
                    <ExternalLink size={13} />
                </a>
                <a href={`/s/${doc.id}/edit`} target="_blank" rel="noopener noreferrer" className={styles.fileActionBtn} title="Edit content">
                    <Pencil size={13} />
                </a>
                <button
                    className={styles.fileActionBtn}
                    title="Rename"
                    onClick={() => { setEditingDoc(doc.id); setEditTitle(doc.title || ''); setEditSlug(doc.slug || ''); }}
                >
                    <FileText size={13} />
                </button>
                <button
                    className={`${styles.fileActionBtn} ${styles.fileActionDanger}`}
                    title="Delete"
                    onClick={() => handleDeleteDoc(doc.id)}
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeUser, setActiveUser] = useState<string | null>(null);
    const [editingDoc, setEditingDoc] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editSlug, setEditSlug] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dragOverUser, setDragOverUser] = useState<string | null>(null);

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
        if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== id));
            if (activeUser === id) setActiveUser(null);
        } else showError('Failed to delete user');
    };

    const handleSaveDoc = async (id: string) => {
        const slug = editSlug.trim().toLowerCase();
        if (slug && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            showError('Slug must be lowercase alphanumeric with dashes');
            return;
        }
        const res = await fetch('/api/admin/docs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, title: editTitle, slug: slug || null }),
        });
        if (res.ok) {
            setDocs(prev => prev.map(d => d.id === id ? { ...d, title: editTitle, slug: slug || undefined } : d));
            setEditingDoc(null);
        } else {
            const data = await res.json().catch(() => ({}));
            showError(data.error || 'Failed to update');
        }
    };

    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = (e: React.DragEvent, docId: string) => {
        e.dataTransfer.setData('text/plain', docId);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDragOverUser(null);
    };

    const handleDropOnUser = async (e: React.DragEvent, userId: string) => {
        e.preventDefault();
        setDragOverUser(null);
        setIsDragging(false);
        const docId = e.dataTransfer.getData('text/plain');
        if (!docId) return;
        setActiveUser(userId);
    };

    const orphanDocs = docs.filter(d => !d.userId);

    const docItemProps = {
        selected, editingDoc, editTitle, editSlug,
        setEditTitle, setEditSlug, setEditingDoc, setSelected,
        handleSaveDoc, handleDeleteDoc, handleDragStart, handleDragEnd,
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

    const activeUserData = activeUser ? users.find(u => u.id === activeUser) : null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    {activeUser ? (
                        <button className={styles.backBtn} onClick={() => setActiveUser(null)}><ArrowLeft size={16} /></button>
                    ) : (
                        <Link href="/dashboard" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                    )}
                    <Shield size={18} />
                    <h1 className={styles.headerTitle}>Admin</h1>
                </div>
                <div className={styles.stats}>
                    <span>{users.length} users</span>
                    <span className={styles.statDot} />
                    <span>{docs.length} docs</span>
                </div>
            </header>

            {actionError && <div className={styles.actionError}>{actionError}</div>}

            {/* Breadcrumb */}
            <nav className={styles.breadcrumb}>
                <button
                    className={`${styles.crumb} ${!activeUser ? styles.crumbActive : ''}`}
                    onClick={() => setActiveUser(null)}
                >
                    All
                </button>
                {activeUserData && (
                    <>
                        <ChevronRight size={14} className={styles.crumbSep} />
                        <span className={styles.crumbActive}>
                            {activeUserData.name || activeUserData.email}
                        </span>
                    </>
                )}
            </nav>

            {/* Main Finder area */}
            {!activeUser ? (
                <div className={styles.finderGrid}>
                    {/* User folders */}
                    {users.map(u => {
                        const userDocs = docs.filter(d => d.userId === u.id);
                        return (
                            <div
                                key={u.id}
                                className={`${styles.finderItem} ${styles.folderItem} ${dragOverUser === u.id ? styles.dropTarget : ''}`}
                                onDoubleClick={() => setActiveUser(u.id)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverUser(u.id); }}
                                onDragLeave={() => setDragOverUser(null)}
                                onDrop={(e) => handleDropOnUser(e, u.id)}
                            >
                                <div className={styles.folderIcon}>
                                    {u.image ? (
                                        <img src={u.image} alt="" className={styles.folderAvatar} />
                                    ) : (
                                        <UserIcon size={20} />
                                    )}
                                    <FolderOpen size={40} strokeWidth={1} />
                                </div>
                                <span className={styles.finderName}>{u.name || u.email.split('@')[0]}</span>
                                <span className={styles.finderMeta}>{userDocs.length} doc{userDocs.length !== 1 ? 's' : ''}</span>
                                <div className={styles.finderActions}>
                                    <span className={`${styles.providerBadge} ${u.provider === 'github' ? styles.githubBadge : ''}`}>
                                        {u.provider}
                                    </span>
                                    <button
                                        className={styles.dangerBtnSmall}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.email); }}
                                        title="Delete user"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Uncategorized docs shown inline — no folder wrapper */}
                    {orphanDocs.length > 0 && (
                        <>
                            <div className={styles.sectionDivider}>
                                <span>Uncategorized</span>
                            </div>
                            {orphanDocs.map(doc => (
                                <DocFileItem key={doc.id} doc={doc} {...docItemProps} />
                            ))}
                        </>
                    )}
                </div>
            ) : (
                /* Documents grid inside a user folder */
                <div className={styles.finderGrid}>
                    {docs.filter(d => d.userId === activeUser).map(doc => (
                        <DocFileItem key={doc.id} doc={doc} {...docItemProps} />
                    ))}

                    {docs.filter(d => d.userId === activeUser).length === 0 && (
                        <div className={styles.emptyFolder}>
                            <FileText size={32} strokeWidth={1} />
                            <p>No documents</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    FileText, Trash2, ExternalLink, Lock, Clock, Pencil, BarChart3, History,
    Plus, Pin, PinOff, FolderOpen, FolderPlus, Crown, Key,
    Upload, Grid3X3, List, ChevronRight, ChevronDown, MoreHorizontal, X,
    ArrowLeft
} from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
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
    preview?: string;
}

type ViewMode = 'finder' | 'explorer';

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className={styles.container}><LoadingScreen /></div>}>
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
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('finder');
    const [plan] = useState<'free' | 'pro'>('pro');
    const [upgradeMsg] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Marquee state for finder view
    const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const marqueeStart = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchDocs = useCallback(async () => {
        try {
            const res = await fetch('/api/user/docs');
            if (res.ok) setDocs(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') fetchDocs();
    }, [status, fetchDocs]);

    // Close context menu on click outside
    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // Escape to deselect
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setSelected(new Set()); setContextMenu(null); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Persist view mode
    useEffect(() => {
        const saved = localStorage.getItem('rf-view-mode');
        if (saved === 'finder' || saved === 'explorer') setViewMode(saved);
    }, []);

    const setView = (mode: ViewMode) => {
        setViewMode(mode);
        localStorage.setItem('rf-view-mode', mode);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this document? This cannot be undone.')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/user/docs/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setDocs(prev => prev.filter(d => d.id !== id));
                setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
            }
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

    const handleMoveToFolder = async (docId: string, folder: string | null) => {
        await fetch(`/api/user/docs/${docId}/organize`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder }),
        });
        setDocs(prev => prev.map(d => d.id === docId ? { ...d, folder: folder || undefined } : d));
    };

    const handleCreateFolder = () => {
        const name = newFolderName.trim();
        if (!name) return;
        // "Create" a folder by assigning a placeholder doc or just adding to UI
        // Folders are virtual — they exist when docs have them. Create by moving a new doc.
        // Instead, just set the folder on a selected doc, or create a blank state
        setCreatingFolder(false);
        setNewFolderName('');
        // We just navigate into the folder — it'll be empty until user drags docs in
        setActiveFolder(name);
    };

    const handleBulkDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Delete ${selected.size} document${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
        const ids = [...selected];
        const results = await Promise.allSettled(ids.map(id =>
            fetch(`/api/user/docs/${id}`, { method: 'DELETE' })
        ));
        const deleted = ids.filter((_, i) => results[i].status === 'fulfilled' && (results[i] as PromiseFulfilledResult<Response>).value.ok);
        setDocs(prev => prev.filter(d => !deleted.includes(d.id)));
        setSelected(new Set());
    };

    const handleBulkMove = async () => {
        const folder = prompt('Move to folder (or empty to remove from folder):');
        if (folder === null) return;
        const value = folder.trim() || null;
        const ids = [...selected];
        await Promise.allSettled(ids.map(id => handleMoveToFolder(id, value)));
        setSelected(new Set());
    };

    // Drag and drop files into folders
    const handleDocDragStart = (e: React.DragEvent, docId: string) => {
        const dragIds = selected.has(docId) ? [...selected] : [docId];
        e.dataTransfer.setData('application/readflow-docs', JSON.stringify(dragIds));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleFolderDrop = async (e: React.DragEvent, folder: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(null);
        const raw = e.dataTransfer.getData('application/readflow-docs');
        if (!raw) return;
        let docIds: string[];
        try { docIds = JSON.parse(raw); } catch { return; }
        await Promise.allSettled(docIds.map(id => handleMoveToFolder(id, folder)));
    };

    const handleRootDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverFolder(null);
        // If dropping files from OS
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setDragging(false);
            uploadFiles(files);
            return;
        }
        // If dropping docs to remove from folder
        const raw = e.dataTransfer.getData('application/readflow-docs');
        if (raw && activeFolder) {
            let docIds: string[];
            try { docIds = JSON.parse(raw); } catch { return; }
            await Promise.allSettled(docIds.map(id => handleMoveToFolder(id, null)));
        }
    };

    // Upload
    const uploadFiles = async (files: File[]) => {
        const mdFiles = files.filter(f => f.name.endsWith('.md'));
        if (mdFiles.length === 0) { setUploadMsg('Only .md files are supported.'); setTimeout(() => setUploadMsg(null), 3000); return; }
        if (mdFiles.length > 5) { setUploadMsg('Maximum 5 files at a time.'); setTimeout(() => setUploadMsg(null), 3000); return; }
        setUploading(true);
        setUploadMsg(`Uploading ${mdFiles.length} file${mdFiles.length > 1 ? 's' : ''}...`);
        let success = 0;
        for (const file of mdFiles) {
            try {
                const content = await file.text();
                const title = file.name.replace(/\.md$/i, '');
                const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, title }) });
                if (res.ok) success++;
            } catch {}
        }
        setUploading(false);
        setUploadMsg(success > 0 ? `Uploaded ${success} file${success > 1 ? 's' : ''}.` : 'Upload failed.');
        if (success > 0) fetchDocs();
        setTimeout(() => setUploadMsg(null), 3000);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
    };
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) uploadFiles(files);
        e.target.value = '';
    };


    // Selection
    const onSelectItem = (id: string, e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey) {
            setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
        } else {
            setSelected(new Set([id]));
        }
    };

    // Marquee (finder only)
    const handleMarqueeStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest(`.${styles.finderItem}`)) return;
        marqueeStart.current = { x: e.clientX, y: e.clientY };
        if (!e.metaKey && !e.ctrlKey) setSelected(new Set());
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!marqueeStart.current || !gridRef.current) return;
            const s = marqueeStart.current;
            const x = Math.min(s.x, e.clientX), y = Math.min(s.y, e.clientY);
            const w = Math.abs(e.clientX - s.x), h = Math.abs(e.clientY - s.y);
            if (w < 5 && h < 5) return;
            setMarquee({ x, y, w, h });
            const items = gridRef.current.querySelectorAll(`[data-docid]`);
            const newSelected = new Set<string>();
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                if (!(rect.right < x || rect.left > x + w || rect.bottom < y || rect.top > y + h)) {
                    const docId = (item as HTMLElement).dataset.docid;
                    if (docId) newSelected.add(docId);
                }
            });
            setSelected(newSelected);
        };
        const handleMouseUp = () => { marqueeStart.current = null; setMarquee(null); };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, []);

    // Derived data
    const folders = [...new Set(docs.filter(d => d.folder).map(d => d.folder!))].sort();
    const currentDocs = activeFolder
        ? docs.filter(d => d.folder === activeFolder)
        : docs.filter(d => !d.folder);
    const allRootDocs = docs.filter(d => !d.folder);

    if (status === 'loading' || loading) {
        return <div className={styles.container}><LoadingScreen /></div>;
    }
    if (!session) return null;

    const isAdmin = false; // admin link shown separately

    return (
        <div
            className={`${styles.container} ${dragging ? styles.dropActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleRootDrop}
        >
            {dragging && (
                <div className={styles.dropOverlay}>
                    <Upload size={40} strokeWidth={1.5} />
                    <p>Drop .md files here (max 5)</p>
                </div>
            )}
            <input ref={fileInputRef} type="file" accept=".md" multiple onChange={handleFileInput} style={{ display: 'none' }} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoIcon}>R</span>
                        <span className={styles.logoText}>Readflow</span>
                    </Link>
                    <span className={styles.sep}>/</span>
                    <h1 className={styles.title}>Documents</h1>
                    {plan === 'pro' && <span className={styles.proBadge}><Crown size={11} /> Pro</span>}
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.viewToggle}>
                        <button className={`${styles.viewBtn} ${viewMode === 'finder' ? styles.viewActive : ''}`} onClick={() => setView('finder')} title="Finder view">
                            <Grid3X3 size={14} />
                        </button>
                        <button className={`${styles.viewBtn} ${viewMode === 'explorer' ? styles.viewActive : ''}`} onClick={() => setView('explorer')} title="Explorer view">
                            <List size={14} />
                        </button>
                    </div>
                    <Link href="/settings" className={styles.settingsBtn} title="Settings">
                        <Key size={14} />
                    </Link>
                    <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Upload size={14} /> Upload
                    </button>
                    <Link href="/" className={styles.newBtn}>
                        <Plus size={16} /> New
                    </Link>
                </div>
            </header>

            {upgradeMsg && <div className={styles.upgradeSuccess}>Welcome to Pro! All features are now unlocked.</div>}

            {uploadMsg && <div className={styles.uploadMsg}>{uploadMsg}</div>}

            {/* Explorer View */}
            {viewMode === 'explorer' && (
                <div className={styles.explorerLayout}>
                    {/* Sidebar */}
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <span className={styles.sidebarTitle}>Projects</span>
                            <button className={styles.sidebarAction} onClick={() => setCreatingFolder(true)} title="New folder">
                                <FolderPlus size={14} />
                            </button>
                        </div>

                        {creatingFolder && (
                            <div className={styles.newFolderInput}>
                                <input
                                    autoFocus
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); } }}
                                    placeholder="Folder name..."
                                    className={styles.folderInput}
                                />
                            </div>
                        )}

                        <button
                            className={`${styles.sidebarItem} ${!activeFolder ? styles.sidebarActive : ''}`}
                            onClick={() => setActiveFolder(null)}
                        >
                            <FileText size={14} />
                            <span>All Documents</span>
                            <span className={styles.sidebarCount}>{docs.length}</span>
                        </button>

                        {folders.map(f => {
                            const folderDocs = docs.filter(d => d.folder === f);
                            const expanded = expandedFolders.has(f);
                            return (
                                <div key={f}>
                                    <div
                                        className={`${styles.sidebarItem} ${activeFolder === f ? styles.sidebarActive : ''} ${dragOverFolder === f ? styles.sidebarDragOver : ''}`}
                                        onClick={() => { setActiveFolder(f); setExpandedFolders(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; }); }}
                                        onDragOver={e => { e.preventDefault(); setDragOverFolder(f); }}
                                        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverFolder(null); }}
                                        onDrop={e => handleFolderDrop(e, f)}
                                    >
                                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        <FolderOpen size={14} />
                                        <span className={styles.sidebarFolderName}>{f}</span>
                                        <span className={styles.sidebarCount}>{folderDocs.length}</span>
                                    </div>
                                    {expanded && folderDocs.map(doc => (
                                        <button
                                            key={doc.id}
                                            className={`${styles.sidebarFile} ${selected.has(doc.id) ? styles.sidebarFileActive : ''}`}
                                            onClick={e => onSelectItem(doc.id, e)}
                                            draggable
                                            onDragStart={e => handleDocDragStart(e, doc.id)}
                                        >
                                            <FileText size={12} />
                                            <span>{doc.title || 'Untitled'}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}

                        {allRootDocs.length > 0 && (
                            <>
                                <div className={styles.sidebarDivider} />
                                <button
                                    className={`${styles.sidebarItem} ${activeFolder === null ? '' : ''}`}
                                    onClick={() => setActiveFolder(null)}
                                    style={{ opacity: 0.7 }}
                                >
                                    <FileText size={14} />
                                    <span>Unfiled</span>
                                    <span className={styles.sidebarCount}>{allRootDocs.length}</span>
                                </button>
                            </>
                        )}
                    </aside>

                    {/* Main content area */}
                    <main className={styles.explorerMain}>
                        <div className={styles.explorerHeader}>
                            {activeFolder ? (
                                <>
                                    <button className={styles.explorerBack} onClick={() => setActiveFolder(null)}><ArrowLeft size={14} /></button>
                                    <FolderOpen size={16} />
                                    <h2 className={styles.explorerTitle}>{activeFolder}</h2>
                                    <span className={styles.explorerCount}>{currentDocs.length} documents</span>
                                </>
                            ) : (
                                <>
                                    <FileText size={16} />
                                    <h2 className={styles.explorerTitle}>All Documents</h2>
                                    <span className={styles.explorerCount}>{docs.length} documents</span>
                                </>
                            )}
                        </div>

                        {(activeFolder ? currentDocs : docs).length === 0 ? (
                            <div className={styles.empty}>
                                <FileText size={40} strokeWidth={1.2} />
                                <h2>{activeFolder ? 'Empty project' : 'No documents yet'}</h2>
                                <p>{activeFolder ? 'Drag documents here or create a new one.' : 'Documents you share will appear here.'}</p>
                                <Link href="/" className={styles.emptyBtn}>Create a document</Link>
                            </div>
                        ) : (
                            <div className={styles.explorerList}>
                                {(activeFolder ? currentDocs : docs).map(doc => (
                                    <div
                                        key={doc.id}
                                        className={`${styles.explorerRow} ${selected.has(doc.id) ? styles.explorerRowSelected : ''} ${doc.pinned ? styles.explorerRowPinned : ''}`}
                                        onClick={e => onSelectItem(doc.id, e)}
                                        draggable
                                        onDragStart={e => handleDocDragStart(e, doc.id)}
                                        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, docId: doc.id }); }}
                                    >
                                        <FileText size={16} className={styles.explorerRowIcon} />
                                        <div className={styles.explorerRowInfo}>
                                            <span className={styles.explorerRowTitle}>{doc.title || 'Untitled'}</span>
                                            {doc.preview && <span className={styles.explorerRowPreview}>{doc.preview.replace(/[#*`>\-\[\]()!]/g, '').slice(0, 80)}</span>}
                                        </div>
                                        <div className={styles.explorerRowMeta}>
                                            {doc.pinned && <Pin size={12} className={styles.pinIcon} />}
                                            {doc.hasPassword && <Lock size={12} />}
                                            {doc.folder && !activeFolder && <span className={styles.folderLabel}>{doc.folder}</span>}
                                            <span className={styles.explorerRowDate}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className={styles.explorerRowActions}>
                                            <a href={`/s/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.rowAction} title="View"><ExternalLink size={14} /></a>
                                            <a href={`/s/${doc.id}/edit`} target="_blank" rel="noopener noreferrer" className={styles.rowAction} title="Edit"><Pencil size={14} /></a>
                                            <button className={styles.rowAction} onClick={e => { e.stopPropagation(); handlePin(doc.id, !!doc.pinned); }} title={doc.pinned ? 'Unpin' : 'Pin'}>
                                                {doc.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                            </button>
                                            <button className={`${styles.rowAction} ${styles.rowDanger}`} onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            )}

            {/* Finder View */}
            {viewMode === 'finder' && (
                <>
                    {/* Breadcrumb */}
                    <nav className={styles.breadcrumb}>
                        <button className={`${styles.crumb} ${!activeFolder ? styles.crumbActive : ''}`} onClick={() => setActiveFolder(null)}>All</button>
                        {activeFolder && (
                            <>
                                <ChevronRight size={14} className={styles.crumbSep} />
                                <span className={styles.crumbActive}>{activeFolder}</span>
                            </>
                        )}
                        <button className={styles.newFolderBtn} onClick={() => setCreatingFolder(true)} title="New folder">
                            <FolderPlus size={14} />
                        </button>
                    </nav>

                    {creatingFolder && (
                        <div className={styles.newFolderBar}>
                            <FolderOpen size={16} />
                            <input
                                autoFocus
                                className={styles.folderInput}
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); } }}
                                placeholder="Project name..."
                            />
                            <button className={styles.folderInputBtn} onClick={handleCreateFolder}>Create</button>
                            <button className={styles.folderInputCancel} onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}><X size={14} /></button>
                        </div>
                    )}

                    <div className={styles.finderGrid} ref={gridRef} onMouseDown={handleMarqueeStart}>
                        {!activeFolder && folders.map(f => {
                            const folderDocs = docs.filter(d => d.folder === f);
                            return (
                                <div
                                    key={`folder-${f}`}
                                    className={`${styles.finderItem} ${styles.folderItem} ${dragOverFolder === f ? styles.dropTarget : ''}`}
                                    onDoubleClick={() => setActiveFolder(f)}
                                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverFolder(f); }}
                                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverFolder(null); }}
                                    onDrop={e => handleFolderDrop(e, f)}
                                >
                                    <div className={styles.folderIcon}>
                                        <FolderOpen size={44} strokeWidth={1} />
                                    </div>
                                    <span className={styles.finderName}>{f}</span>
                                    <span className={styles.finderMeta}>{folderDocs.length} doc{folderDocs.length !== 1 ? 's' : ''}</span>
                                </div>
                            );
                        })}

                        {!activeFolder && folders.length > 0 && allRootDocs.length > 0 && (
                            <div className={styles.sectionDivider}><span>Documents</span></div>
                        )}

                        {(activeFolder ? currentDocs : allRootDocs).map(doc => (
                            <DocFileItem
                                key={doc.id}
                                doc={doc}
                                selected={selected.has(doc.id)}
                                onSelect={onSelectItem}
                                onDelete={handleDelete}
                                onPin={handlePin}
                                onDragStart={handleDocDragStart}
                                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, docId: doc.id }); }}
                            />
                        ))}

                        {(activeFolder ? currentDocs : allRootDocs).length === 0 && folders.length === 0 && (
                            <div className={styles.emptyFinder}>
                                <FileText size={40} strokeWidth={1.2} />
                                <h2>No documents yet</h2>
                                <p>Documents you share will appear here.</p>
                                <Link href="/" className={styles.emptyBtn}>Create a document</Link>
                            </div>
                        )}

                        {activeFolder && currentDocs.length === 0 && (
                            <div className={styles.emptyFinder}>
                                <FolderOpen size={40} strokeWidth={1.2} />
                                <h2>Empty project</h2>
                                <p>Drag documents here or create a new one.</p>
                            </div>
                        )}
                    </div>

                    {marquee && <div className={styles.marquee} style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
                </>
            )}

            {/* Bulk action bar */}
            {selected.size >= 1 && (
                <div className={styles.bulkBar}>
                    <span className={styles.bulkCount}>{selected.size} selected</span>
                    <button className={styles.bulkBtn} onClick={handleBulkMove}><FolderOpen size={13} /> Move</button>
                    <button className={`${styles.bulkBtn} ${styles.bulkDanger}`} onClick={handleBulkDelete}><Trash2 size={13} /> Delete</button>
                    <button className={styles.bulkBtnClear} onClick={() => setSelected(new Set())}><X size={13} /></button>
                </div>
            )}

            {/* Context menu */}
            {contextMenu && (() => {
                const doc = docs.find(d => d.id === contextMenu.docId);
                if (!doc) return null;
                return (
                    <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
                        <a href={`/s/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.contextItem}><ExternalLink size={13} /> Open</a>
                        <a href={`/s/${doc.id}/edit`} target="_blank" rel="noopener noreferrer" className={styles.contextItem}><Pencil size={13} /> Edit</a>
                        <a href={`/s/${doc.id}/versions`} target="_blank" rel="noopener noreferrer" className={styles.contextItem}><History size={13} /> Versions</a>
                        <a href={`/s/${doc.id}/analytics`} target="_blank" rel="noopener noreferrer" className={styles.contextItem}><BarChart3 size={13} /> Analytics</a>
                        <div className={styles.contextDivider} />
                        <button className={styles.contextItem} onClick={() => { handlePin(doc.id, !!doc.pinned); setContextMenu(null); }}>
                            {doc.pinned ? <><PinOff size={13} /> Unpin</> : <><Pin size={13} /> Pin</>}
                        </button>
                        <div className={styles.contextDivider} />
                        {folders.length > 0 && (
                            <div className={styles.contextSubmenu}>
                                <span className={styles.contextLabel}>Move to project</span>
                                {folders.map(f => (
                                    <button key={f} className={styles.contextItem} onClick={() => { handleMoveToFolder(doc.id, f); setContextMenu(null); }}>
                                        <FolderOpen size={13} /> {f}
                                    </button>
                                ))}
                                {doc.folder && (
                                    <button className={styles.contextItem} onClick={() => { handleMoveToFolder(doc.id, null); setContextMenu(null); }}>
                                        <X size={13} /> Remove from project
                                    </button>
                                )}
                            </div>
                        )}
                        <button className={styles.contextItem} onClick={() => {
                            const name = prompt('New project name:');
                            if (name?.trim()) { handleMoveToFolder(doc.id, name.trim()); setContextMenu(null); }
                        }}><FolderPlus size={13} /> New project</button>
                        <div className={styles.contextDivider} />
                        <button className={`${styles.contextItem} ${styles.contextDanger}`} onClick={() => { handleDelete(doc.id); setContextMenu(null); }}>
                            <Trash2 size={13} /> Delete
                        </button>
                    </div>
                );
            })()}
        </div>
    );
}

function DocFileItem({ doc, selected, onSelect, onDelete, onPin, onDragStart, onContextMenu }: {
    doc: DocEntry;
    selected: boolean;
    onSelect: (id: string, e: React.MouseEvent) => void;
    onDelete: (id: string) => void;
    onPin: (id: string, pinned: boolean) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onContextMenu: (e: React.MouseEvent, docId: string) => void;
}) {
    const previewLines = (doc.preview || '').replace(/[#*`>\-\[\]()!]/g, '').split('\n').filter(l => l.trim()).slice(0, 6);

    return (
        <div
            data-docid={doc.id}
            className={`${styles.finderItem} ${styles.fileItem} ${selected ? styles.fileSelected : ''} ${doc.pinned ? styles.filePinned : ''}`}
            draggable
            onDragStart={e => onDragStart(e, doc.id)}
            onClick={e => { e.stopPropagation(); onSelect(doc.id, e); }}
            onContextMenu={e => { e.preventDefault(); onContextMenu(e, doc.id); }}
        >
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
                        </div>
                    )}
                </div>
                {doc.pinned && <Pin size={10} className={styles.filePinBadge} />}
                {doc.hasPassword && <Lock size={10} className={styles.fileLockBadge} />}
                <span className={styles.fileExt}>.md</span>
            </div>

            <span className={styles.finderName} title={doc.title || 'Untitled'}>{doc.title || 'Untitled'}</span>
            {doc.slug && <span className={styles.fileSlug}>/p/{doc.slug}</span>}
            <span className={styles.finderMeta}>{new Date(doc.createdAt).toLocaleDateString()}</span>

            <div className={styles.fileActions} onClick={e => e.stopPropagation()}>
                <a href={`/s/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.fileActionBtn} title="Open"><ExternalLink size={13} /></a>
                <a href={`/s/${doc.id}/edit`} target="_blank" rel="noopener noreferrer" className={styles.fileActionBtn} title="Edit"><Pencil size={13} /></a>
                <button className={styles.fileActionBtn} onClick={() => onPin(doc.id, !!doc.pinned)} title={doc.pinned ? 'Unpin' : 'Pin'}>
                    {doc.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
                <button className={`${styles.fileActionBtn} ${styles.fileActionDanger}`} onClick={() => onDelete(doc.id)} title="Delete">
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

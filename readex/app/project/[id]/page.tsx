'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, FileText, Network, Plus, ExternalLink, Pencil,
    Trash2, X, Settings
} from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import ThemeToggle from '@/components/ThemeToggle';
import GraphView from '@/components/project/GraphView';
import styles from './page.module.css';

interface ProjectData {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    docCount: number;
}

interface DocEntry {
    id: string;
    title?: string;
    createdAt: number;
    hasPassword: boolean;
    slug?: string;
    pinned?: boolean;
    preview?: string;
}

interface GraphData {
    nodes: { id: string; title: string; linkCount: number }[];
    edges: { source: string; target: string; label?: string }[];
}

type Tab = 'docs' | 'graph';

export default function ProjectPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectData | null>(null);
    const [docs, setDocs] = useState<DocEntry[]>([]);
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
    const [tab, setTab] = useState<Tab>('docs');
    const [loading, setLoading] = useState(true);
    const [addModal, setAddModal] = useState(false);
    const [userDocs, setUserDocs] = useState<DocEntry[]>([]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchProject = useCallback(async () => {
        try {
            const [projRes, docsRes, graphRes] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                fetch(`/api/projects/${projectId}/docs`),
                fetch(`/api/projects/${projectId}/graph`),
            ]);

            if (projRes.ok) setProject(await projRes.json());
            else router.push('/dashboard');

            if (docsRes.ok) setDocs(await docsRes.json());
            if (graphRes.ok) setGraphData(await graphRes.json());
        } finally {
            setLoading(false);
        }
    }, [projectId, router]);

    useEffect(() => {
        if (status === 'authenticated') fetchProject();
    }, [status, fetchProject]);

    const handleRemoveDoc = async (docId: string) => {
        const res = await fetch(`/api/projects/${projectId}/docs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docId, action: 'remove' }),
        });
        if (res.ok) {
            setDocs(prev => prev.filter(d => d.id !== docId));
        }
    };

    const handleAddDoc = async (docId: string) => {
        const res = await fetch(`/api/projects/${projectId}/docs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docId }),
        });
        if (res.ok) {
            setAddModal(false);
            fetchProject();
        }
    };

    const openAddModal = async () => {
        const res = await fetch('/api/user/docs');
        if (res.ok) {
            const allDocs: DocEntry[] = await res.json();
            // Filter out docs already in this project
            const projectDocIds = new Set(docs.map(d => d.id));
            setUserDocs(allDocs.filter(d => !projectDocIds.has(d.id)));
        }
        setAddModal(true);
    };

    const handleNodeClick = (nodeId: string) => {
        window.open(`/s/${nodeId}`, '_blank');
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><LoadingScreen /></div>;
    }

    if (!session || !project) return null;

    const linkCount = graphData.edges.length;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backBtn}>
                    <ArrowLeft size={14} />
                </Link>
                {project.icon && <span className={styles.projectIcon}>{project.icon}</span>}
                <h1 className={styles.projectName}>{project.name}</h1>
                {project.description && (
                    <span className={styles.projectDesc}>{project.description}</span>
                )}
                <div className={styles.headerActions}>
                    <ThemeToggle />
                    <button className={styles.settingsBtn} title="Project settings">
                        <Settings size={14} />
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <nav className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tab === 'docs' ? styles.tabActive : ''}`}
                    onClick={() => setTab('docs')}
                >
                    <FileText size={14} /> Documents
                </button>
                <button
                    className={`${styles.tab} ${tab === 'graph' ? styles.tabActive : ''}`}
                    onClick={() => setTab('graph')}
                >
                    <Network size={14} /> Graph
                </button>
            </nav>

            {/* Documents tab */}
            {tab === 'docs' && (
                <div className={styles.layout}>
                    {/* Sidebar */}
                    <aside className={styles.sidebar}>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <div className={styles.statValue}>{docs.length}</div>
                                <div className={styles.statLabel}>Docs</div>
                            </div>
                            <div className={styles.stat}>
                                <div className={styles.statValue}>{linkCount}</div>
                                <div className={styles.statLabel}>Links</div>
                            </div>
                            <div className={styles.stat}>
                                <div className={styles.statValue}>
                                    {graphData.nodes.filter(n => n.linkCount === 0).length}
                                </div>
                                <div className={styles.statLabel}>Orphans</div>
                            </div>
                        </div>

                        {docs.length > 0 && (
                            <div className={styles.sidebarSection}>
                                <div className={styles.sidebarLabel}>Recent</div>
                                <div className={styles.sidebarList}>
                                    {docs.slice(0, 5).map(d => (
                                        <a
                                            key={d.id}
                                            href={`/s/${d.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.sidebarDoc}
                                        >
                                            <FileText size={13} />
                                            <span className={styles.sidebarDocName}>
                                                {d.title || 'Untitled'}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Main doc list */}
                    <div className={styles.mainContent}>
                        <div className={styles.addBar}>
                            <button className={styles.addBtn} onClick={openAddModal}>
                                <Plus size={16} /> Add Document
                            </button>
                        </div>

                        {docs.length === 0 ? (
                            <div className={styles.empty}>
                                <FileText size={40} strokeWidth={1.2} />
                                <h2>No documents in this project</h2>
                                <p>Add existing documents or create new ones to build your knowledge base.</p>
                            </div>
                        ) : (
                            <div className={styles.docList}>
                                {docs.map(doc => (
                                    <div key={doc.id} className={styles.docRow}>
                                        <FileText size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                                        <div className={styles.docRowInfo}>
                                            <span className={styles.docRowTitle}>
                                                {doc.title || 'Untitled'}
                                            </span>
                                            {doc.preview && (
                                                <span className={styles.docRowPreview}>
                                                    {doc.preview.replace(/[#*`>\-\[\]()!]/g, '').slice(0, 80)}
                                                </span>
                                            )}
                                        </div>
                                        <span className={styles.docRowMeta}>
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                        <div className={styles.docRowActions}>
                                            <a
                                                href={`/s/${doc.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.docAction}
                                                title="Open"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            <a
                                                href={`/s/${doc.id}/edit`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.docAction}
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </a>
                                            <button
                                                className={`${styles.docAction} ${styles.docActionDanger}`}
                                                onClick={() => handleRemoveDoc(doc.id)}
                                                title="Remove from project"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Graph tab */}
            {tab === 'graph' && (
                <div className={styles.graphContainer}>
                    <GraphView
                        nodes={graphData.nodes}
                        edges={graphData.edges}
                        onNodeClick={handleNodeClick}
                    />
                </div>
            )}

            {/* Add document modal */}
            {addModal && (
                <div className={styles.modalOverlay} onClick={() => setAddModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Add document to project</h3>
                            <button className={styles.modalClose} onClick={() => setAddModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {userDocs.length === 0 ? (
                                <div className={styles.modalEmpty}>
                                    No available documents to add. Create new documents first.
                                </div>
                            ) : (
                                <div className={styles.modalDocList}>
                                    {userDocs.map(d => (
                                        <button
                                            key={d.id}
                                            className={styles.modalDocItem}
                                            onClick={() => handleAddDoc(d.id)}
                                        >
                                            <FileText size={14} />
                                            {d.title || 'Untitled'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

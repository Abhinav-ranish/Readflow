'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Plus, ArrowLeft, X, FileText, Trash2, Settings } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import styles from './brains.module.css';

interface ProjectEntry {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    docCount: number;
    createdAt: number;
    updatedAt: number;
}

export default function BrainsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [projects, setProjects] = useState<ProjectEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) setProjects(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') fetchProjects();
    }, [status, fetchProjects]);

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        setCreating(true);
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: newDesc.trim() || undefined }),
        });
        if (res.ok) {
            const proj = await res.json();
            setNewName('');
            setNewDesc('');
            router.push(`/project/${proj.id}`);
        }
        setCreating(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete project "${name}"? Documents won't be deleted.`)) return;
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                    <BrainCircuit size={18} />
                    <h1 className={styles.title}>Brains</h1>
                </div>
                <ThemeToggle />
            </header>

            <p className={styles.subtitle}>
                Upload curated project knowledge via the CLI with <code>readflow brain</code>.
                Each brain is a collection of docs, notes, and specs from your project.
            </p>

            <div className={styles.createBar}>
                <input
                    className={styles.input}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="New brain name..."
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <button className={styles.createBtn} onClick={handleCreate} disabled={creating || !newName.trim()}>
                    <Plus size={14} /> Create
                </button>
            </div>

            {projects.length === 0 ? (
                <div className={styles.empty}>
                    <BrainCircuit size={40} strokeWidth={1.2} />
                    <h2>No brains yet</h2>
                    <p>Create a brain to organize project knowledge, or use the CLI:</p>
                    <code className={styles.codeBlock}>npx readflow-md brain</code>
                </div>
            ) : (
                <div className={styles.grid}>
                    {projects.map(p => (
                        <div key={p.id} className={styles.card}>
                            <Link href={`/project/${p.id}`} className={styles.cardLink}>
                                <div className={styles.cardIcon}>
                                    <BrainCircuit size={28} strokeWidth={1.3} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardName}>{p.icon ? `${p.icon} ` : ''}{p.name}</span>
                                    <span className={styles.cardMeta}>
                                        {p.docCount} doc{p.docCount !== 1 ? 's' : ''}
                                        {p.description && ` · ${p.description}`}
                                    </span>
                                    <span className={styles.cardDate}>
                                        Updated {new Date(p.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </Link>
                            <button className={styles.deleteBtn} onClick={() => handleDelete(p.id, p.name)} title="Delete brain">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

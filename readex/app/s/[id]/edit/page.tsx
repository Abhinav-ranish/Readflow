'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import { ArrowLeft, Save, Eye, EyeOff, History, Link as LinkIcon } from 'lucide-react';
import styles from './edit.module.css';

export default function EditPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const docId = params.id as string;

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [slug, setSlug] = useState('');
    const [slugSaved, setSlugSaved] = useState(false);
    const [slugError, setSlugError] = useState<string | null>(null);
    const [showSlugInput, setShowSlugInput] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchDoc = useCallback(async () => {
        try {
            // Try normal user flow first (versions + user docs)
            const res = await fetch(`/api/share/${docId}/versions`);
            let loaded = false;
            if (res.ok) {
                const versions = await res.json();
                if (versions.length > 0) {
                    setContent(versions[0].content);
                    loaded = true;
                }
            }
            // Fetch title/slug from user docs
            const docRes = await fetch(`/api/user/docs`);
            if (docRes.ok) {
                const docs = await docRes.json();
                const doc = docs.find((d: any) => d.id === docId);
                if (doc?.title) setTitle(doc.title);
                if (doc?.slug) setSlug(doc.slug);
                // If no versions but doc exists in user's list, content is on the main entry
                if (!loaded && doc) loaded = true;
            }
            // Fallback: try admin endpoint (works if user is admin viewing someone else's doc)
            if (!loaded) {
                const adminRes = await fetch(`/api/admin/docs/${docId}`);
                if (adminRes.ok) {
                    const data = await adminRes.json();
                    if (data.content) setContent(data.content);
                    if (data.title) setTitle(data.title);
                    if (data.slug) setSlug(data.slug);
                    loaded = true;
                }
            }
            if (!loaded) {
                setError('Document not found or not authorized');
            }
        } catch {
            setError('Failed to load document');
        } finally {
            setLoading(false);
        }
    }, [docId]);

    useEffect(() => {
        if (status === 'authenticated') fetchDoc();
    }, [status, fetchDoc]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            let res = await fetch(`/api/share/${docId}/edit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, title: title || undefined }),
            });
            // Fallback to admin endpoint if normal edit fails (admin editing another user's doc)
            if (!res.ok) {
                res = await fetch(`/api/admin/docs/${docId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, title: title || undefined }),
                });
            }
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to save');
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleSetSlug = async () => {
        setSlugError(null);
        setSlugSaved(false);
        const normalized = slug.toLowerCase().trim();
        if (!normalized || normalized.length < 3) {
            setSlugError('Min 3 characters');
            return;
        }
        try {
            const res = await fetch(`/api/share/${docId}/slug`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: normalized }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to set slug');
            }
            setSlug(normalized);
            setSlugSaved(true);
            setTimeout(() => setSlugSaved(false), 2000);
        } catch (e) {
            setSlugError(e instanceof Error ? e.message : 'Failed');
        }
    };

    // Cmd+S to save
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });

    if (status === 'loading' || loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
    }

    if (error && !content) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={16} />
                    </Link>
                    <input
                        className={styles.titleInput}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Untitled document"
                    />
                </div>
                <div className={styles.headerRight}>
                    {error && <span className={styles.errorMsg}>{error}</span>}
                    {saved && <span className={styles.savedMsg}>Saved</span>}
                    <Link href={`/s/${docId}/versions`} className={styles.iconBtn} title="Version History">
                        <History size={16} />
                    </Link>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setShowPreview(p => !p)}
                        title={showPreview ? 'Hide Preview' : 'Show Preview'}
                    >
                        {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setShowSlugInput(p => !p)}
                        title="Custom URL"
                    >
                        <LinkIcon size={16} />
                    </button>
                    <button
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={15} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </header>

            {showSlugInput && (
                <div className={styles.slugBar}>
                    <span className={styles.slugPrefix}>readflow.aranish.uk/p/</span>
                    <input
                        className={styles.slugInput}
                        value={slug}
                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="my-custom-url"
                        maxLength={50}
                    />
                    <button className={styles.slugBtn} onClick={handleSetSlug}>
                        {slugSaved ? 'Saved' : 'Set'}
                    </button>
                    {slugError && <span className={styles.errorMsg}>{slugError}</span>}
                </div>
            )}

            <div className={`${styles.workspace} ${showPreview ? styles.split : ''}`}>
                <div className={styles.editorPane}>
                    <Editor value={content} onChange={setContent} className={styles.editor} />
                </div>
                {showPreview && (
                    <div className={styles.previewPane}>
                        <Preview content={content} />
                    </div>
                )}
            </div>
        </div>
    );
}

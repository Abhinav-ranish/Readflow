'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import styles from './CommentSection.module.css';

interface Comment {
    id: string;
    authorName: string;
    content: string;
    createdAt: number;
}

interface CommentSectionProps {
    docId: string;
}

export default function CommentSection({ docId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState('');
    const [name, setName] = useState('');
    const [sending, setSending] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`/api/share/${docId}/comments`);
            if (res.ok) setComments(await res.json());
        } catch { /* ignore */ }
    }, [docId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSending(true);
        try {
            const res = await fetch(`/api/share/${docId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text.trim(), authorName: name.trim() || undefined }),
            });
            if (res.ok) {
                setText('');
                fetchComments();
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <button className={styles.toggle} onClick={() => setIsOpen(!isOpen)}>
                <MessageSquare size={16} />
                Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </button>

            {isOpen && (
                <div className={styles.panel}>
                    {comments.length === 0 ? (
                        <p className={styles.empty}>No comments yet. Be the first!</p>
                    ) : (
                        <div className={styles.list}>
                            {comments.map(c => (
                                <div key={c.id} className={styles.comment}>
                                    <div className={styles.commentHeader}>
                                        <span className={styles.author}>{c.authorName}</span>
                                        <span className={styles.time}>{formatTime(c.createdAt)}</span>
                                    </div>
                                    <p className={styles.body}>{c.content}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your name (optional)"
                            className={styles.nameInput}
                            maxLength={50}
                        />
                        <div className={styles.inputRow}>
                            <input
                                type="text"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Add a comment..."
                                className={styles.textInput}
                                maxLength={2000}
                            />
                            <button type="submit" className={styles.sendBtn} disabled={sending || !text.trim()}>
                                <Send size={15} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function formatTime(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

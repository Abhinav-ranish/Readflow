'use client';
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import styles from './PasswordGate.module.css';

interface PasswordGateProps {
    docId: string;
    onUnlock: () => void;
}

export default function PasswordGate({ docId, onUnlock }: PasswordGateProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/share/${docId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                sessionStorage.setItem(`rf_unlock_${docId}`, '1');
                onUnlock();
            } else {
                setError('Incorrect password');
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrap}>
                    <Lock size={28} />
                </div>
                <h2 className={styles.title}>This document is protected</h2>
                <p className={styles.subtitle}>Enter the password to view this document.</p>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        className={styles.input}
                        autoFocus
                    />
                    {error && <span className={styles.error}>{error}</span>}
                    <button type="submit" className={styles.btn} disabled={loading || !password}>
                        {loading ? 'Verifying...' : 'Unlock'}
                    </button>
                </form>
            </div>
        </div>
    );
}

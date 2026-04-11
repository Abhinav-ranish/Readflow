'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Check, X, Loader2 } from 'lucide-react';

export default function CliAuthPage() {
    return (
        <Suspense fallback={<div style={styles.container}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}>
            <CliAuthContent />
        </Suspense>
    );
}

function CliAuthContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const [approving, setApproving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async () => {
        if (!code) return;
        setApproving(true);
        setError(null);
        try {
            const res = await fetch('/api/cli/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', code }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Failed to authorize');
                return;
            }
            setDone(true);
        } catch {
            setError('Failed to connect');
        } finally {
            setApproving(false);
        }
    };

    if (!code) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <X size={32} style={{ color: '#f85149' }} />
                    <h2 style={styles.title}>Invalid Link</h2>
                    <p style={styles.desc}>This authorization link is missing a code. Try again from the CLI.</p>
                </div>
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={styles.desc}>Loading...</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <Shield size={32} />
                    <h2 style={styles.title}>Sign in Required</h2>
                    <p style={styles.desc}>Sign in to authorize the CLI to post to your account.</p>
                    <Link href={`/login?callbackUrl=${encodeURIComponent(`/cli/auth?code=${code}`)}`} style={styles.btn}>
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <Check size={32} style={{ color: '#3fb950' }} />
                    <h2 style={styles.title}>CLI Authorized</h2>
                    <p style={styles.desc}>
                        Logged in as <strong>{session?.user?.email}</strong>.<br />
                        Return to your terminal — the CLI will pick this up automatically.
                    </p>
                    <p style={styles.hint}>You can close this tab.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <Shield size={32} />
                <h2 style={styles.title}>Authorize Readflow CLI</h2>
                <p style={styles.desc}>
                    The CLI is requesting access to post documents to your account
                    (<strong>{session?.user?.email}</strong>).
                </p>
                <div style={styles.codeBox}>
                    <span style={styles.codeLabel}>Code</span>
                    <code style={styles.code}>{code}</code>
                </div>
                {error && <p style={styles.error}>{error}</p>}
                <div style={styles.actions}>
                    <button style={styles.btn} onClick={handleApprove} disabled={approving}>
                        {approving ? 'Authorizing...' : 'Authorize'}
                    </button>
                    <button style={styles.cancelBtn} onClick={() => window.close()}>
                        Deny
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--fg-primary)',
        padding: '2rem',
    },
    card: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        maxWidth: '400px',
        width: '100%',
        padding: '2.5rem 2rem',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        textAlign: 'center',
    },
    title: {
        fontSize: '1.2rem',
        fontWeight: 600,
        margin: 0,
    },
    desc: {
        fontSize: '0.9rem',
        color: 'var(--fg-secondary)',
        lineHeight: 1.5,
        margin: 0,
    },
    codeBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 24px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
    },
    codeLabel: {
        fontSize: '0.7rem',
        color: 'var(--fg-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    code: {
        fontSize: '1.4rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.15em',
    },
    error: {
        fontSize: '0.85rem',
        color: '#f85149',
        margin: 0,
    },
    actions: {
        display: 'flex',
        gap: '10px',
        width: '100%',
    },
    btn: {
        flex: 1,
        padding: '10px 20px',
        fontSize: '0.9rem',
        fontWeight: 500,
        backgroundColor: 'var(--accent-dim)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        textDecoration: 'none',
        textAlign: 'center',
    },
    cancelBtn: {
        flex: 1,
        padding: '10px 20px',
        fontSize: '0.9rem',
        backgroundColor: 'transparent',
        color: 'var(--fg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        cursor: 'pointer',
    },
    hint: {
        fontSize: '0.8rem',
        color: 'var(--fg-muted)',
        margin: 0,
    },
};

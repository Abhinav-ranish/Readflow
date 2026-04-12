'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Calendar, Key, Copy, RefreshCw, Shield, Trash2, AlertTriangle, Crown, ExternalLink } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import styles from './settings.module.css';

interface UserProfile {
    id: string;
    email: string;
    name?: string;
    image?: string;
    provider: string;
    plan: string;
    createdAt: number;
}

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [agentToken, setAgentToken] = useState<string | null>(null);
    const [maskedToken, setMaskedToken] = useState<string | null>(null);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [tokenMsg, setTokenMsg] = useState<string | null>(null);
    const [tokenRevealed, setTokenRevealed] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/user/account');
            if (res.ok) setProfile(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchToken = useCallback(async () => {
        try {
            const res = await fetch('/api/user/apikey');
            if (res.ok) {
                const data = await res.json();
                if (data.hasKey) setMaskedToken(data.masked);
            }
        } catch {}
    }, []);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchProfile();
            fetchToken();
        }
    }, [status, fetchProfile, fetchToken]);

    const generateToken = async () => {
        if (maskedToken && !confirm('This will replace your current token. Any CLI/agents using the old token will stop working. Continue?')) return;
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

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== 'DELETE') return;
        setDeleting(true);
        try {
            const res = await fetch('/api/user/account', { method: 'DELETE' });
            if (res.ok) {
                await signOut({ callbackUrl: '/' });
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to delete account');
            }
        } catch {
            alert('Failed to delete account');
        } finally {
            setDeleting(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><LoadingScreen /></div>;
    }

    if (!profile) {
        return <div className={styles.container}><LoadingScreen text="Loading profile..." /></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                <h1 className={styles.headerTitle}>Settings</h1>
            </header>

            {/* Profile Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><User size={16} /> Profile</h2>
                <div className={styles.profileCard}>
                    <div className={styles.profileLeft}>
                        {profile.image ? (
                            <img src={profile.image} alt="" className={styles.avatar} />
                        ) : (
                            <div className={styles.avatarFallback}><User size={28} /></div>
                        )}
                        <div className={styles.profileInfo}>
                            <span className={styles.profileName}>{profile.name || 'No name'}</span>
                            <span className={styles.profileEmail}><Mail size={13} /> {profile.email}</span>
                        </div>
                    </div>
                    <div className={styles.profileMeta}>
                        <div className={styles.metaItem}>
                            <Calendar size={13} />
                            <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <Shield size={13} />
                            <span className={styles.providerBadge}>{profile.provider}</span>
                        </div>
                        <div className={styles.metaItem}>
                            {profile.plan === 'pro' ? (
                                <span className={styles.planPro}><Crown size={12} /> Pro</span>
                            ) : (
                                <span className={styles.planFree}>Free</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Agent Token Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><Key size={16} /> Agent Token</h2>
                <p className={styles.sectionDesc}>
                    Use this token to share documents from the CLI, scripts, or AI agents. Documents created with your token will appear in your dashboard.
                </p>

                <div className={styles.tokenCard}>
                    <div className={styles.tokenRow}>
                        {maskedToken && !tokenRevealed && (
                            <code className={styles.tokenValue}>{maskedToken}</code>
                        )}
                        {agentToken && tokenRevealed && (
                            <>
                                <code className={styles.tokenValue}>{agentToken}</code>
                                <button className={styles.tokenAction} onClick={copyToken} title="Copy">
                                    <Copy size={14} />
                                </button>
                            </>
                        )}
                        {!maskedToken && !agentToken && (
                            <span className={styles.tokenNone}>No token generated yet</span>
                        )}
                    </div>
                    {tokenMsg && <div className={styles.tokenMsg}>{tokenMsg}</div>}
                    <button className={styles.tokenGenBtn} onClick={generateToken} disabled={tokenLoading}>
                        <RefreshCw size={14} />
                        {maskedToken ? 'Rotate Token' : 'Generate Token'}
                    </button>
                    <div className={styles.tokenHelp}>
                        <span>Usage:</span>
                        <code>curl -X POST https://readflow.aranish.uk/api/share -H &quot;Authorization: Bearer YOUR_TOKEN&quot; -H &quot;Content-Type: application/json&quot; -d &apos;{'{'}...{'}'}&apos;</code>
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            <section className={`${styles.section} ${styles.dangerSection}`}>
                <h2 className={styles.sectionTitle}><AlertTriangle size={16} /> Danger Zone</h2>
                <div className={styles.dangerCard}>
                    <div className={styles.dangerInfo}>
                        <h3 className={styles.dangerTitle}>Delete Account</h3>
                        <p className={styles.dangerDesc}>
                            This will permanently delete your account and <strong>all your documents</strong>, including their versions, comments, and analytics. Shared links will stop working. This action cannot be undone.
                        </p>
                    </div>
                    <div className={styles.dangerActions}>
                        <label className={styles.dangerLabel}>
                            Type <strong>DELETE</strong> to confirm:
                        </label>
                        <input
                            className={styles.dangerInput}
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder="DELETE"
                        />
                        <button
                            className={styles.dangerBtn}
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirm !== 'DELETE' || deleting}
                        >
                            <Trash2 size={14} />
                            {deleting ? 'Deleting...' : 'Delete My Account'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

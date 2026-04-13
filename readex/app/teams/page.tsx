'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, FileText, Crown, ArrowLeft, X, UserPlus, Trash2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import styles from './teams.module.css';

interface Team {
    id: string;
    name: string;
    ownerId: string;
    role: string;
    memberCount: number;
    createdAt: number;
}

interface TeamDetail {
    id: string;
    name: string;
    ownerId: string;
    members: { userId: string; role: string; name?: string; email?: string; image?: string; joinedAt: number }[];
    docs: { id: string; title?: string; createdAt: number; slug?: string }[];
}

export default function TeamsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [activeTeam, setActiveTeam] = useState<TeamDetail | null>(null);
    const [inviteId, setInviteId] = useState('');
    const userId = (session?.user as any)?.dbId;

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchTeams = useCallback(async () => {
        try {
            const res = await fetch('/api/teams');
            if (res.ok) setTeams(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === 'authenticated') fetchTeams();
    }, [status, fetchTeams]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        const res = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
        if (res.ok) {
            setNewName('');
            fetchTeams();
        }
        setCreating(false);
    };

    const openTeam = async (teamId: string) => {
        const res = await fetch(`/api/teams/${teamId}`);
        if (res.ok) setActiveTeam(await res.json());
    };

    const handleInvite = async () => {
        if (!inviteId.trim() || !activeTeam) return;
        await fetch(`/api/teams/${activeTeam.id}/members`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: inviteId.trim() }),
        });
        setInviteId('');
        openTeam(activeTeam.id);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!activeTeam) return;
        await fetch(`/api/teams/${activeTeam.id}/members`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: memberId }),
        });
        openTeam(activeTeam.id);
    };

    if (status === 'loading' || loading) {
        return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                    <Users size={18} />
                    <h1 className={styles.title}>Teams</h1>
                </div>
                <ThemeToggle />
            </header>

            {!activeTeam ? (
                <>
                    <div className={styles.createBar}>
                        <input
                            className={styles.input}
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="New team name..."
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        <button className={styles.createBtn} onClick={handleCreate} disabled={creating || !newName.trim()}>
                            <Plus size={14} /> Create
                        </button>
                    </div>

                    {teams.length === 0 ? (
                        <div className={styles.empty}>
                            <Users size={40} strokeWidth={1.2} />
                            <h2>No teams yet</h2>
                            <p>Create a team to share and manage documents together.</p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {teams.map(team => (
                                <button key={team.id} className={styles.card} onClick={() => openTeam(team.id)}>
                                    <div className={styles.cardIcon}><Users size={24} strokeWidth={1.5} /></div>
                                    <div className={styles.cardInfo}>
                                        <span className={styles.cardName}>{team.name}</span>
                                        <span className={styles.cardMeta}>
                                            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                                            {team.role === 'owner' && <Crown size={11} className={styles.ownerBadge} />}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className={styles.detail}>
                    <div className={styles.detailHeader}>
                        <button className={styles.backBtn} onClick={() => setActiveTeam(null)}><ArrowLeft size={16} /></button>
                        <h2 className={styles.detailTitle}>{activeTeam.name}</h2>
                        <span className={styles.detailCount}>{activeTeam.members.length} member{activeTeam.members.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Members</h3>
                        {activeTeam.ownerId === userId && (
                            <div className={styles.inviteBar}>
                                <input
                                    className={styles.input}
                                    value={inviteId}
                                    onChange={e => setInviteId(e.target.value)}
                                    placeholder="User ID to invite..."
                                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                />
                                <button className={styles.inviteBtn} onClick={handleInvite} disabled={!inviteId.trim()}>
                                    <UserPlus size={14} /> Add
                                </button>
                            </div>
                        )}
                        <div className={styles.memberList}>
                            {activeTeam.members.map(m => (
                                <div key={m.userId} className={styles.memberRow}>
                                    {m.image ? (
                                        <img src={m.image} alt="" className={styles.memberAvatar} />
                                    ) : (
                                        <div className={styles.memberAvatarFallback}><Users size={14} /></div>
                                    )}
                                    <div className={styles.memberInfo}>
                                        <span className={styles.memberName}>{m.name || m.email || m.userId}</span>
                                        <span className={styles.memberRole}>{m.role}</span>
                                    </div>
                                    {activeTeam.ownerId === userId && m.userId !== userId && (
                                        <button className={styles.removeBtn} onClick={() => handleRemoveMember(m.userId)}>
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Documents ({activeTeam.docs.length})</h3>
                        {activeTeam.docs.length === 0 ? (
                            <p className={styles.emptyText}>No documents shared with this team yet.</p>
                        ) : (
                            <div className={styles.docList}>
                                {activeTeam.docs.map(doc => (
                                    <Link key={doc.id} href={`/s/${doc.id}`} className={styles.docRow}>
                                        <FileText size={14} />
                                        <span>{doc.title || 'Untitled'}</span>
                                        <span className={styles.docDate}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

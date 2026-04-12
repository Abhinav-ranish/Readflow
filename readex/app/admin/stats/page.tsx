'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, FileText, Eye, TrendingUp, BarChart3 } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import styles from './stats.module.css';

interface AdminStats {
    totalUsers: number;
    totalDocs: number;
    totalViews: number;
    userGrowth: { date: string; count: number }[];
    docGrowth: { date: string; count: number }[];
    viewsPerDay: { date: string; count: number }[];
    topDocs: { id: string; title?: string; views: number }[];
}

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminStatsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        (async () => {
            try {
                const res = await fetch('/api/admin/stats');
                if (res.status === 403) { setError('You do not have admin access.'); return; }
                if (!res.ok) { setError('Failed to load stats.'); return; }
                setStats(await res.json());
            } catch {
                setError('Failed to load stats.');
            } finally {
                setLoading(false);
            }
        })();
    }, [status]);

    if (status === 'loading' || loading) {
        return <div className={styles.container}><LoadingScreen /></div>;
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorPage}>
                    <Shield size={40} />
                    <h2>{error}</h2>
                    <Link href="/admin" className={styles.backLink}>Back to Admin</Link>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const viewsMax = Math.max(...stats.viewsPerDay.map(d => d.count), 1);
    const docsMax = Math.max(...stats.docGrowth.map(d => d.count), 1);
    const usersMax = Math.max(...stats.userGrowth.map(d => d.count), 1);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/admin" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                    <BarChart3 size={18} />
                    <h1 className={styles.headerTitle}>Platform Analytics</h1>
                </div>
                <span className={styles.cacheNote}>Cached 5 min</span>
            </header>

            {/* Summary cards */}
            <div className={styles.cards}>
                <div className={styles.card}>
                    <div className={styles.cardIcon}><Users size={22} /></div>
                    <div className={styles.cardValue}>{stats.totalUsers.toLocaleString()}</div>
                    <div className={styles.cardLabel}>Total Users</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardIcon}><FileText size={22} /></div>
                    <div className={styles.cardValue}>{stats.totalDocs.toLocaleString()}</div>
                    <div className={styles.cardLabel}>Total Documents</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardIcon}><Eye size={22} /></div>
                    <div className={styles.cardValue}>{stats.totalViews.toLocaleString()}</div>
                    <div className={styles.cardLabel}>Total Views</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardIcon}><TrendingUp size={22} /></div>
                    <div className={styles.cardValue}>
                        {stats.viewsPerDay.length > 0 ? stats.viewsPerDay[0].count : 0}
                    </div>
                    <div className={styles.cardLabel}>Views Today</div>
                </div>
            </div>

            {/* Views chart */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><Eye size={16} /> Views — Last 30 Days</h2>
                {stats.viewsPerDay.length === 0 ? (
                    <div className={styles.noData}>No view data yet</div>
                ) : (
                    <div className={styles.chart}>
                        {stats.viewsPerDay.slice().reverse().map(day => (
                            <div key={day.date} className={styles.bar} title={`${day.date}: ${day.count} views`}>
                                <div className={styles.barFill} style={{ height: `${(day.count / viewsMax) * 100}%` }} />
                                <span className={styles.barLabel}>{fmtDate(day.date)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* User growth chart */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><Users size={16} /> User Signups — Last 30 Days</h2>
                {stats.userGrowth.length === 0 ? (
                    <div className={styles.noData}>No signup data yet</div>
                ) : (
                    <div className={styles.chart}>
                        {stats.userGrowth.slice().reverse().map(day => (
                            <div key={day.date} className={`${styles.bar} ${styles.barUsers}`} title={`${day.date}: ${day.count} signups`}>
                                <div className={styles.barFill} style={{ height: `${(day.count / usersMax) * 100}%` }} />
                                <span className={styles.barLabel}>{fmtDate(day.date)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Doc creation chart */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><FileText size={16} /> Documents Created — Last 30 Days</h2>
                {stats.docGrowth.length === 0 ? (
                    <div className={styles.noData}>No document data yet</div>
                ) : (
                    <div className={styles.chart}>
                        {stats.docGrowth.slice().reverse().map(day => (
                            <div key={day.date} className={`${styles.bar} ${styles.barDocs}`} title={`${day.date}: ${day.count} docs`}>
                                <div className={styles.barFill} style={{ height: `${(day.count / docsMax) * 100}%` }} />
                                <span className={styles.barLabel}>{fmtDate(day.date)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Top documents */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><TrendingUp size={16} /> Top Documents</h2>
                {stats.topDocs.length === 0 ? (
                    <div className={styles.noData}>No documents yet</div>
                ) : (
                    <div className={styles.table}>
                        <div className={styles.tableHeader}>
                            <span>Document</span>
                            <span>Views</span>
                        </div>
                        {stats.topDocs.filter(d => d.views > 0).map((doc, i) => (
                            <a key={doc.id} href={`/s/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.tableRow}>
                                <span className={styles.tableRank}>#{i + 1}</span>
                                <span className={styles.tableTitle}>{doc.title || 'Untitled'}</span>
                                <span className={styles.tableCount}>{doc.views.toLocaleString()}</span>
                            </a>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

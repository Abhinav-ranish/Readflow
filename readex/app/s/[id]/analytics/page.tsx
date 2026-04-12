'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Users, Eye, TrendingUp } from 'lucide-react';
import styles from './analytics.module.css';
import LoadingScreen from '@/components/LoadingScreen';

interface ViewStats {
    total: number;
    unique: number;
    recent: { date: string; count: number }[];
}

export default function AnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const docId = params.id as string;

    const [stats, setStats] = useState<ViewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/share/${docId}/stats`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to load');
            }
            const data = await res.json();
            setStats(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [docId]);

    useEffect(() => {
        if (status === 'authenticated') fetchStats();
    }, [status, fetchStats]);

    if (status === 'loading' || loading) {
        return <div className={styles.container}><LoadingScreen /></div>;
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    const maxCount = stats ? Math.max(...stats.recent.map(r => r.count), 1) : 1;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backBtn}>
                        <ArrowLeft size={16} />
                    </Link>
                    <BarChart3 size={18} />
                    <h1 className={styles.title}>Analytics</h1>
                </div>
                <Link href={`/s/${docId}`} className={styles.viewLink}>
                    View Document
                </Link>
            </header>

            {stats && (
                <>
                    <div className={styles.cards}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}><Eye size={20} /></div>
                            <div className={styles.statValue}>{stats.total.toLocaleString()}</div>
                            <div className={styles.statLabel}>Total Views</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}><Users size={20} /></div>
                            <div className={styles.statValue}>{stats.unique.toLocaleString()}</div>
                            <div className={styles.statLabel}>Unique Visitors</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}><TrendingUp size={20} /></div>
                            <div className={styles.statValue}>
                                {stats.recent.length > 0 ? stats.recent[0].count : 0}
                            </div>
                            <div className={styles.statLabel}>Views Today</div>
                        </div>
                    </div>

                    <div className={styles.chartSection}>
                        <h2 className={styles.chartTitle}>Views — Last 30 Days</h2>
                        {stats.recent.length === 0 ? (
                            <div className={styles.noData}>No view data yet</div>
                        ) : (
                            <div className={styles.chart}>
                                {stats.recent.slice().reverse().map(day => (
                                    <div key={day.date} className={styles.bar} title={`${day.date}: ${day.count} views`}>
                                        <div
                                            className={styles.barFill}
                                            style={{ height: `${(day.count / maxCount) * 100}%` }}
                                        />
                                        <span className={styles.barLabel}>
                                            {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.tableSection}>
                        <h2 className={styles.chartTitle}>Daily Breakdown</h2>
                        <div className={styles.table}>
                            <div className={styles.tableHeader}>
                                <span>Date</span>
                                <span>Views</span>
                            </div>
                            {stats.recent.map(day => (
                                <div key={day.date} className={styles.tableRow}>
                                    <span>{day.date}</span>
                                    <span className={styles.tableCount}>{day.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

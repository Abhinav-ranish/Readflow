'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, FileText, Eye, TrendingUp, BarChart3, Activity } from 'lucide-react';
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

type Period = '7d' | '14d' | '30d';

function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function calcTrend(data: { count: number }[]): { pct: number; direction: 'up' | 'down' | 'flat' } {
    if (data.length < 4) return { pct: 0, direction: 'flat' };
    const half = Math.floor(data.length / 2);
    const recent = data.slice(0, half).reduce((s, d) => s + d.count, 0);
    const older = data.slice(half).reduce((s, d) => s + d.count, 0);
    if (older === 0) return { pct: recent > 0 ? 100 : 0, direction: recent > 0 ? 'up' : 'flat' };
    const pct = Math.round(((recent - older) / older) * 100);
    return { pct: Math.abs(pct), direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

function AreaChart({ data, color, id }: { data: { date: string; count: number }[]; color: string; id: string }) {
    if (data.length === 0) return <div className={styles.noData}>No data yet</div>;

    const reversed = [...data].reverse();
    const max = Math.max(...reversed.map(d => d.count), 1);
    const w = 600, h = 180, px = 40, py = 24, pb = 30;
    const plotW = w - px * 2;
    const plotH = h - py - pb;

    const points = reversed.map((d, i) => ({
        x: px + (i / Math.max(reversed.length - 1, 1)) * plotW,
        y: py + plotH - (d.count / max) * plotH,
        ...d,
    }));

    // Smooth curve using cubic bezier
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        pathD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaD = pathD + ` L ${points[points.length - 1].x} ${py + plotH} L ${points[0].x} ${py + plotH} Z`;

    // Y-axis labels
    const yTicks = 4;
    const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max / yTicks) * (yTicks - i)));

    // X-axis labels — show ~6 evenly spaced
    const xLabelCount = Math.min(6, reversed.length);
    const xStep = Math.max(1, Math.floor((reversed.length - 1) / (xLabelCount - 1)));

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className={styles.chartSvg} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {/* Grid lines */}
            {yLabels.map((_, i) => {
                const y = py + (i / yTicks) * plotH;
                return <line key={i} x1={px} y1={y} x2={w - px} y2={y} stroke="var(--border-subtle)" strokeWidth="0.5" />;
            })}
            {/* Y labels */}
            {yLabels.map((val, i) => {
                const y = py + (i / yTicks) * plotH;
                return <text key={i} x={px - 6} y={y + 3} textAnchor="end" className={styles.axisLabel}>{val}</text>;
            })}
            {/* X labels */}
            {reversed.map((d, i) => {
                if (i % xStep !== 0 && i !== reversed.length - 1) return null;
                return <text key={i} x={points[i].x} y={h - 6} textAnchor="middle" className={styles.axisLabel}>{fmtDate(d.date)}</text>;
            })}
            {/* Area fill */}
            <path d={areaD} fill={`url(#grad-${id})`} />
            {/* Line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots on hover */}
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3" fill={color} opacity="0" className={styles.dot}>
                        <title>{`${fmtDate(p.date)}: ${p.count}`}</title>
                    </circle>
                    <circle cx={p.x} cy={p.y} r="12" fill="transparent" className={styles.dotHitArea}>
                        <title>{`${fmtDate(p.date)}: ${p.count}`}</title>
                    </circle>
                </g>
            ))}
        </svg>
    );
}

export default function AdminStatsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>('30d');

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

    const periodDays = period === '7d' ? 7 : period === '14d' ? 14 : 30;

    const filtered = useMemo(() => {
        if (!stats) return null;
        const slice = (arr: { date: string; count: number }[]) => arr.slice(0, periodDays);
        return {
            views: slice(stats.viewsPerDay),
            users: slice(stats.userGrowth),
            docs: slice(stats.docGrowth),
        };
    }, [stats, periodDays]);

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

    if (!stats || !filtered) return null;

    const viewsTrend = calcTrend(filtered.views);
    const usersTrend = calcTrend(filtered.users);
    const docsTrend = calcTrend(filtered.docs);
    const viewsToday = stats.viewsPerDay.length > 0 ? stats.viewsPerDay[0].count : 0;
    const viewsInPeriod = filtered.views.reduce((s, d) => s + d.count, 0);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/admin" className={styles.backBtn}><ArrowLeft size={16} /></Link>
                    <BarChart3 size={18} />
                    <h1 className={styles.headerTitle}>Analytics</h1>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.periodToggle}>
                        {(['7d', '14d', '30d'] as Period[]).map(p => (
                            <button key={p} className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`} onClick={() => setPeriod(p)}>
                                {p === '7d' ? '7 Days' : p === '14d' ? '14 Days' : '30 Days'}
                            </button>
                        ))}
                    </div>
                    <span className={styles.cacheNote}>Cached 5 min</span>
                </div>
            </header>

            {/* Summary cards */}
            <div className={styles.cards}>
                <div className={styles.card}>
                    <div className={styles.cardTop}>
                        <span className={styles.cardLabel}>Total Users</span>
                        <div className={`${styles.cardIconWrap} ${styles.cardIconBlue}`}><Users size={16} /></div>
                    </div>
                    <div className={styles.cardValue}>{stats.totalUsers.toLocaleString()}</div>
                    <div className={`${styles.cardTrend} ${usersTrend.direction === 'up' ? styles.trendUp : usersTrend.direction === 'down' ? styles.trendDown : ''}`}>
                        {usersTrend.direction !== 'flat' && <TrendingUp size={12} className={usersTrend.direction === 'down' ? styles.trendFlip : ''} />}
                        <span>{usersTrend.direction === 'flat' ? 'No change' : `${usersTrend.direction === 'up' ? '+' : '-'}${usersTrend.pct}% vs prior`}</span>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTop}>
                        <span className={styles.cardLabel}>Total Documents</span>
                        <div className={`${styles.cardIconWrap} ${styles.cardIconGreen}`}><FileText size={16} /></div>
                    </div>
                    <div className={styles.cardValue}>{stats.totalDocs.toLocaleString()}</div>
                    <div className={`${styles.cardTrend} ${docsTrend.direction === 'up' ? styles.trendUp : docsTrend.direction === 'down' ? styles.trendDown : ''}`}>
                        {docsTrend.direction !== 'flat' && <TrendingUp size={12} className={docsTrend.direction === 'down' ? styles.trendFlip : ''} />}
                        <span>{docsTrend.direction === 'flat' ? 'No change' : `${docsTrend.direction === 'up' ? '+' : '-'}${docsTrend.pct}% vs prior`}</span>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTop}>
                        <span className={styles.cardLabel}>Views ({period})</span>
                        <div className={`${styles.cardIconWrap} ${styles.cardIconPurple}`}><Eye size={16} /></div>
                    </div>
                    <div className={styles.cardValue}>{viewsInPeriod.toLocaleString()}</div>
                    <div className={`${styles.cardTrend} ${viewsTrend.direction === 'up' ? styles.trendUp : viewsTrend.direction === 'down' ? styles.trendDown : ''}`}>
                        {viewsTrend.direction !== 'flat' && <TrendingUp size={12} className={viewsTrend.direction === 'down' ? styles.trendFlip : ''} />}
                        <span>{viewsTrend.direction === 'flat' ? 'No change' : `${viewsTrend.direction === 'up' ? '+' : '-'}${viewsTrend.pct}% vs prior`}</span>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTop}>
                        <span className={styles.cardLabel}>Views Today</span>
                        <div className={`${styles.cardIconWrap} ${styles.cardIconAmber}`}><Activity size={16} /></div>
                    </div>
                    <div className={styles.cardValue}>{viewsToday.toLocaleString()}</div>
                    <div className={styles.cardTrend}>
                        <span>Total: {stats.totalViews.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Charts row */}
            <div className={styles.chartsRow}>
                <section className={styles.chartCard}>
                    <h2 className={styles.chartTitle}><Eye size={15} /> Views Trend</h2>
                    <div className={styles.chartWrap}>
                        <AreaChart data={filtered.views} color="#58a6ff" id="views" />
                    </div>
                </section>
                <section className={styles.chartCard}>
                    <h2 className={styles.chartTitle}><Users size={15} /> User Growth</h2>
                    <div className={styles.chartWrap}>
                        <AreaChart data={filtered.users} color="#3fb950" id="users" />
                    </div>
                </section>
            </div>

            {/* Docs chart full width */}
            <section className={styles.chartCardFull}>
                <h2 className={styles.chartTitle}><FileText size={15} /> Documents Created</h2>
                <div className={styles.chartWrap}>
                    <AreaChart data={filtered.docs} color="#d2a8ff" id="docs" />
                </div>
            </section>

            {/* Top documents table */}
            <section className={styles.tableSection}>
                <h2 className={styles.chartTitle}><TrendingUp size={15} /> Top Documents</h2>
                {stats.topDocs.filter(d => d.views > 0).length === 0 ? (
                    <div className={styles.noData}>No documents with views yet</div>
                ) : (
                    <div className={styles.table}>
                        <div className={styles.tableHeader}>
                            <span className={styles.thRank}>#</span>
                            <span className={styles.thTitle}>Document</span>
                            <span className={styles.thViews}>Views</span>
                        </div>
                        {stats.topDocs.filter(d => d.views > 0).map((doc, i) => (
                            <a key={doc.id} href={`/s/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.tableRow}>
                                <span className={styles.tdRank}>{i + 1}</span>
                                <span className={styles.tdTitle}>{doc.title || 'Untitled'}</span>
                                <span className={styles.tdViews}>
                                    <span className={styles.viewsBadge}>{doc.views.toLocaleString()}</span>
                                </span>
                            </a>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

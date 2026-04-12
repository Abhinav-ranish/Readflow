'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Copy, Check, Sparkles, Lock, Timer, BarChart3, History, Zap } from 'lucide-react';
import styles from './demo.module.css';

const TYPING_LINES = [
    { delay: 0, prompt: true, text: 'npx readflow-md share README.md --title "API Docs"' },
    { delay: 1800, prompt: false, text: '' },
    { delay: 2000, prompt: false, text: '  \u2713 Shared successfully!' },
    { delay: 2400, prompt: false, text: '' },
    { delay: 2600, prompt: false, text: '  URL: https://readflow.aranish.uk/s/k8xm2q', link: true },
    { delay: 3000, prompt: false, text: '  \uD83D\uDC64 Posted to your account' },
];

function TypingTerminal() {
    const [visibleLines, setVisibleLines] = useState(0);
    const [typedChars, setTypedChars] = useState(0);
    const [done, setDone] = useState(false);
    const commandText = TYPING_LINES[0].text;

    useEffect(() => {
        // Type the first command character by character
        const typeInterval = setInterval(() => {
            setTypedChars(prev => {
                if (prev >= commandText.length) {
                    clearInterval(typeInterval);
                    return prev;
                }
                return prev + 1;
            });
        }, 35);
        return () => clearInterval(typeInterval);
    }, [commandText.length]);

    useEffect(() => {
        if (typedChars < commandText.length) return;
        // After typing finishes, reveal output lines
        const timers = TYPING_LINES.slice(1).map((line, i) =>
            setTimeout(() => setVisibleLines(i + 2), line.delay)
        );
        const doneTimer = setTimeout(() => setDone(true), 3400);
        return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer); };
    }, [typedChars, commandText.length]);

    // Reset and replay every 8s
    useEffect(() => {
        if (!done) return;
        const reset = setTimeout(() => {
            setVisibleLines(0);
            setTypedChars(0);
            setDone(false);
        }, 4000);
        return () => clearTimeout(reset);
    }, [done]);

    return (
        <div className={styles.term}>
            <div className={styles.termBar}>
                <div className={styles.dots}><i /><i /><i /></div>
                <span className={styles.termTitle}>Terminal</span>
                <div className={styles.dots} style={{ visibility: 'hidden' }}><i /><i /><i /></div>
            </div>
            <div className={styles.termBody}>
                <div className={styles.termLine}>
                    <span className={styles.termPrompt}>$</span>
                    <span className={styles.termCmd}>{commandText.slice(0, typedChars)}</span>
                    {typedChars < commandText.length && <span className={styles.caret} />}
                </div>
                {TYPING_LINES.slice(1).map((line, i) => {
                    if (i + 2 > visibleLines) return null;
                    if (!line.text) return <div key={i} className={styles.termBlank} />;
                    return (
                        <div key={i} className={`${styles.termLine} ${styles.termOut}`}>
                            <span className={line.link ? styles.termLink : undefined}>{line.text}</span>
                        </div>
                    );
                })}
                {done && (
                    <div className={styles.termLine}>
                        <span className={styles.termPrompt}>$</span>
                        <span className={styles.caret} />
                    </div>
                )}
            </div>
        </div>
    );
}

function EditorPreview() {
    const lines = [
        '# API Reference',
        '',
        '## Authentication',
        '',
        'All requests require a Bearer token.',
        '',
        '```bash',
        'curl -H "Authorization: Bearer tk_..."',
        '```',
        '',
        '## Endpoints',
        '',
        '| Method | Path | Description |',
        '|--------|------|-------------|',
        '| POST   | /api/share | Create doc |',
        '| GET    | /s/:id | View doc |',
    ];

    return (
        <div className={styles.editorWrap}>
            <div className={styles.editorBar}>
                <div className={styles.dots}><i /><i /><i /></div>
                <span className={styles.editorUrl}>readflow.aranish.uk</span>
                <div className={styles.dots} style={{ visibility: 'hidden' }}><i /><i /><i /></div>
            </div>
            <div className={styles.editorBody}>
                <div className={styles.editorSide}>
                    {lines.map((line, i) => (
                        <div key={i} className={styles.eLine}>
                            <span className={styles.eNum}>{i + 1}</span>
                            <span className={styles.eText}>{line || '\u00A0'}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.editorPreview}>
                    <h2 className={styles.pH1}>API Reference</h2>
                    <h3 className={styles.pH2}>Authentication</h3>
                    <p className={styles.pText}>All requests require a Bearer token.</p>
                    <pre className={styles.pCode}>curl -H &quot;Authorization: Bearer tk_...&quot;</pre>
                    <h3 className={styles.pH2}>Endpoints</h3>
                    <div className={styles.pTable}>
                        <div className={styles.pRow}><span>POST</span><span>/api/share</span><span>Create doc</span></div>
                        <div className={styles.pRow}><span>GET</span><span>/s/:id</span><span>View doc</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DemoPage() {
    const [copied, setCopied] = useState(false);
    const copy = (t: string) => { navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); };

    return (
        <div className={styles.page}>
            {/* Nav */}
            <nav className={styles.nav}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoR}>R</span>
                    <span>Readflow</span>
                </Link>
                <div className={styles.navRight}>
                    <Link href="/login" className={styles.navLink}>Sign in</Link>
                    <Link href="/" className={styles.navCta}>Open Editor</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.heroBadge}><Sparkles size={13} /> Markdown sharing, simplified</div>
                <h1 className={styles.h1}>Write. Share. Done.</h1>
                <p className={styles.heroSub}>
                    A fast markdown editor with instant sharing, version history, and analytics.
                    Use the web app or share from your terminal.
                </p>
                <div className={styles.heroBtns}>
                    <Link href="/" className={styles.btnPrimary}>
                        Start writing <ArrowRight size={15} />
                    </Link>
                    <div className={styles.installBox}>
                        <code>npx readflow-md share README.md</code>
                        <button onClick={() => copy('npx readflow-md share README.md')} className={styles.copyBtn}>
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </section>

            {/* Web demo */}
            <section className={styles.section}>
                <div className={styles.sectionLabel}>Web App</div>
                <h2 className={styles.h2}>Full-featured editor with live preview</h2>
                <p className={styles.sectionSub}>
                    Split-pane editing, AI assist, LaTeX, Mermaid diagrams, keyboard shortcuts.
                </p>
                <EditorPreview />
            </section>

            {/* CLI demo */}
            <section className={styles.section}>
                <div className={styles.sectionLabel}>CLI</div>
                <h2 className={styles.h2}>Share from your terminal in seconds</h2>
                <p className={styles.sectionSub}>
                    One command to share any markdown file. Authenticate once, post to your dashboard.
                </p>
                <TypingTerminal />
            </section>

            {/* Features grid */}
            <section className={styles.section}>
                <div className={styles.sectionLabel}>Features</div>
                <h2 className={styles.h2}>Everything you need</h2>
                <div className={styles.features}>
                    {[
                        { icon: <Zap size={18} />, title: 'Instant sharing', desc: 'Get a shareable link in one click. No signup required.' },
                        { icon: <Lock size={18} />, title: 'Password protection', desc: 'Protect sensitive docs with a password and optional expiry.' },
                        { icon: <History size={18} />, title: 'Version history', desc: 'Every edit is tracked. Restore any previous version.' },
                        { icon: <BarChart3 size={18} />, title: 'View analytics', desc: 'Track views, unique visitors, and daily trends.' },
                        { icon: <Sparkles size={18} />, title: 'AI assist', desc: 'Summarize, expand, fix grammar, translate, and polish.' },
                        { icon: <Copy size={18} />, title: 'Export anywhere', desc: 'Download as PDF, HTML, or raw markdown.' },
                    ].map(f => (
                        <div key={f.title} className={styles.featureCard}>
                            <div className={styles.featureIcon}>{f.icon}</div>
                            <h3 className={styles.featureTitle}>{f.title}</h3>
                            <p className={styles.featureDesc}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className={styles.ctaSection}>
                <h2 className={styles.ctaH2}>Ready to try it?</h2>
                <p className={styles.ctaSub}>No signup needed. Start writing and share instantly.</p>
                <div className={styles.ctaBtns}>
                    <Link href="/" className={styles.btnPrimary}>
                        Open Editor <ArrowRight size={15} />
                    </Link>
                    <Link href="/login" className={styles.btnSecondary}>
                        Sign in
                    </Link>
                </div>
            </section>

            <footer className={styles.footer}>
                <span>Readflow</span>
                <span className={styles.footDot} />
                <a href="https://www.npmjs.com/package/readflow-md" target="_blank" rel="noopener noreferrer">npm</a>
                <span className={styles.footDot} />
                <a href="https://github.com/Abhinav-ranish/Readflow" target="_blank" rel="noopener noreferrer">GitHub</a>
            </footer>
        </div>
    );
}

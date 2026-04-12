'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Copy, Check, Sparkles, Lock, BarChart3, History, Zap, Terminal, Globe, Wand2 } from 'lucide-react';
import styles from './demo.module.css';

// ── CLI typing sequences ──────────────────────────────────
const CLI_SEQUENCES = [
    {
        cmd: 'npx readflow-md share README.md',
        output: [
            { text: '', blank: true },
            { text: '  \u2713 Shared successfully!' },
            { text: '' , blank: true },
            { text: '  URL: https://readflow.aranish.uk/s/k8xm2q', link: true },
            { text: '  \uD83D\uDC64 Posted to your account' },
        ],
    },
    {
        cmd: 'npx readflow-md share docs/api.md --password s3cret --expires 7d',
        output: [
            { text: '', blank: true },
            { text: '  \u2713 Shared successfully!' },
            { text: '' , blank: true },
            { text: '  URL: https://readflow.aranish.uk/s/t9vm3x', link: true },
            { text: '  \uD83D\uDD12 Password-protected' },
            { text: '  \u23F1  Expires in 7d' },
        ],
    },
    {
        cmd: 'npx readflow-md login',
        output: [
            { text: '', blank: true },
            { text: '  Starting browser login...' },
            { text: '  Browser opened! Approve the login there.' },
            { text: '', blank: true },
            { text: '  \u2713 Logged in as dev@example.com' },
            { text: '  All shares will be linked to your account.' },
        ],
    },
];

function AnimatedTerminal() {
    const [seqIdx, setSeqIdx] = useState(0);
    const [chars, setChars] = useState(0);
    const [outputLines, setOutputLines] = useState(0);
    const [phase, setPhase] = useState<'typing' | 'output' | 'pause'>('typing');
    const [history, setHistory] = useState<{ cmd: string; output: typeof CLI_SEQUENCES[0]['output'] }[]>([]);

    const seq = CLI_SEQUENCES[seqIdx];

    // Type command
    useEffect(() => {
        if (phase !== 'typing') return;
        if (chars >= seq.cmd.length) {
            setPhase('output');
            return;
        }
        const t = setTimeout(() => setChars(c => c + 1), 30 + Math.random() * 25);
        return () => clearTimeout(t);
    }, [phase, chars, seq.cmd.length]);

    // Reveal output lines
    useEffect(() => {
        if (phase !== 'output') return;
        if (outputLines >= seq.output.length) {
            setPhase('pause');
            return;
        }
        const t = setTimeout(() => setOutputLines(n => n + 1), 180);
        return () => clearTimeout(t);
    }, [phase, outputLines, seq.output.length]);

    // Pause then move to next sequence
    useEffect(() => {
        if (phase !== 'pause') return;
        const t = setTimeout(() => {
            setHistory(h => [...h, { cmd: seq.cmd, output: seq.output }]);
            setSeqIdx(i => (i + 1) % CLI_SEQUENCES.length);
            setChars(0);
            setOutputLines(0);
            setPhase('typing');
        }, 2500);
        return () => clearTimeout(t);
    }, [phase, seq]);

    // Reset history when it gets long
    useEffect(() => {
        if (history.length > 4) setHistory(h => h.slice(-2));
    }, [history.length]);

    return (
        <div className={styles.term}>
            <div className={styles.winBar}>
                <div className={styles.dots}><i /><i /><i /></div>
                <span className={styles.winLabel}><Terminal size={11} /> Terminal</span>
                <div style={{ width: 52 }} />
            </div>
            <div className={styles.termBody}>
                {/* History */}
                {history.map((h, hi) => (
                    <div key={hi} className={styles.termBlock}>
                        <div className={styles.termLine}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.cmd}>{h.cmd}</span>
                        </div>
                        {h.output.map((o, oi) =>
                            o.blank ? <div key={oi} className={styles.termGap} /> :
                            <div key={oi} className={styles.termLine}>
                                <span className={o.link ? styles.termLink : styles.termOut}>{o.text}</span>
                            </div>
                        )}
                    </div>
                ))}

                {/* Current */}
                <div className={styles.termBlock}>
                    <div className={styles.termLine}>
                        <span className={styles.prompt}>$</span>
                        <span className={styles.cmd}>{seq.cmd.slice(0, chars)}</span>
                        {phase === 'typing' && <span className={styles.caret} />}
                    </div>
                    {Array.from({ length: outputLines }).map((_, i) => {
                        const o = seq.output[i];
                        if (o.blank) return <div key={i} className={styles.termGap} />;
                        return (
                            <div key={i} className={`${styles.termLine} ${styles.termFadeIn}`}>
                                <span className={o.link ? styles.termLink : styles.termOut}>{o.text}</span>
                            </div>
                        );
                    })}
                    {phase === 'pause' && (
                        <div className={styles.termLine}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.caret} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Web editor with typing + AI ──────────────────────────
const EDITOR_LINES = [
    '# Project Setup Guide',
    '',
    '## Prerequisites',
    '',
    '- Node.js 18+',
    '- npm or yarn',
    '',
    '## Installation',
    '',
    '```bash',
    'npm install readflow-md',
    '```',
    '',
    '## Quick Start',
    '',
    'Import and configure:',
];

const AI_RESULT = [
    '',
    '```javascript',
    'import { share } from "readflow-md";',
    '',
    'const url = await share("README.md", {',
    '  title: "My Docs",',
    '  password: "optional",',
    '});',
    'console.log(url);',
    '```',
];

function AnimatedEditor() {
    const [visibleLines, setVisibleLines] = useState(0);
    const [showAI, setShowAI] = useState(false);
    const [aiLines, setAiLines] = useState(0);
    const [phase, setPhase] = useState<'typing' | 'ai-trigger' | 'ai-typing' | 'done'>('typing');

    // Reveal editor lines one at a time
    useEffect(() => {
        if (phase !== 'typing') return;
        if (visibleLines >= EDITOR_LINES.length) {
            setPhase('ai-trigger');
            return;
        }
        const delay = EDITOR_LINES[visibleLines] === '' ? 100 : 120 + Math.random() * 80;
        const t = setTimeout(() => setVisibleLines(n => n + 1), delay);
        return () => clearTimeout(t);
    }, [phase, visibleLines]);

    // Show AI sparkle
    useEffect(() => {
        if (phase !== 'ai-trigger') return;
        const t = setTimeout(() => { setShowAI(true); setPhase('ai-typing'); }, 800);
        return () => clearTimeout(t);
    }, [phase]);

    // AI writes lines
    useEffect(() => {
        if (phase !== 'ai-typing') return;
        if (aiLines >= AI_RESULT.length) {
            setPhase('done');
            return;
        }
        const t = setTimeout(() => setAiLines(n => n + 1), 100);
        return () => clearTimeout(t);
    }, [phase, aiLines]);

    // Reset
    useEffect(() => {
        if (phase !== 'done') return;
        const t = setTimeout(() => {
            setVisibleLines(0);
            setShowAI(false);
            setAiLines(0);
            setPhase('typing');
        }, 4000);
        return () => clearTimeout(t);
    }, [phase]);

    const allLines = [...EDITOR_LINES.slice(0, visibleLines), ...AI_RESULT.slice(0, aiLines)];

    return (
        <div className={styles.editor}>
            <div className={styles.winBar}>
                <div className={styles.dots}><i /><i /><i /></div>
                <span className={styles.winLabel}><Globe size={11} /> readflow.aranish.uk</span>
                <div style={{ width: 52 }} />
            </div>
            <div className={styles.editorBody}>
                <div className={styles.editorCode}>
                    {allLines.map((line, i) => (
                        <div key={i} className={`${styles.eLine} ${i >= visibleLines ? styles.aiLine : ''}`}>
                            <span className={styles.eNum}>{i + 1}</span>
                            <span className={styles.eText}>{line || '\u00A0'}</span>
                        </div>
                    ))}
                    {phase === 'typing' && (
                        <div className={styles.eLine}>
                            <span className={styles.eNum}>{visibleLines + 1}</span>
                            <span className={styles.caret} />
                        </div>
                    )}
                </div>
                {/* AI badge */}
                {showAI && (
                    <div className={styles.aiBadge}>
                        <Wand2 size={12} />
                        <span>AI generating code example...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────
export default function DemoPage() {
    const [copied, setCopied] = useState(false);
    const copy = (t: string) => {
        navigator.clipboard.writeText(t);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className={styles.page}>
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
                <div className={styles.heroBadge}><Sparkles size={12} /> Open-source markdown sharing</div>
                <h1 className={styles.h1}>
                    Markdown that<br />
                    <span className={styles.h1Accent}>goes places.</span>
                </h1>
                <p className={styles.heroSub}>
                    Write in the browser. Share from the terminal. Track everything.
                </p>
                <div className={styles.heroCtas}>
                    <Link href="/" className={styles.btnPrimary}>
                        Open Editor <ArrowRight size={15} />
                    </Link>
                    <Link href="/login" className={styles.btnGhost}>Sign in</Link>
                </div>
            </section>

            {/* Side-by-side demo */}
            <section className={styles.demoStage}>
                <div className={styles.demoGrid}>
                    <AnimatedTerminal />
                    <AnimatedEditor />
                </div>
                <div className={styles.demoCaption}>
                    <div className={styles.captionItem}>
                        <Terminal size={14} />
                        <span>CLI shares any .md file in one command</span>
                    </div>
                    <div className={styles.captionDivider} />
                    <div className={styles.captionItem}>
                        <Sparkles size={14} />
                        <span>AI writes, fixes, and translates inline</span>
                    </div>
                </div>
            </section>

            {/* Install */}
            <section className={styles.installSection}>
                <div className={styles.installBox}>
                    <code>npm install -g readflow-md</code>
                    <button onClick={() => copy('npm install -g readflow-md')} className={styles.copyBtn}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                </div>
                <span className={styles.installNote}>or use npx without installing</span>
            </section>

            {/* Features */}
            <section className={styles.section}>
                <h2 className={styles.h2}>Everything included</h2>
                <div className={styles.features}>
                    {[
                        { icon: <Zap size={18} />, title: 'Instant sharing', desc: 'One click or one command. Get a link, share it anywhere.' },
                        { icon: <Lock size={18} />, title: 'Password & expiry', desc: 'Protect docs with passwords. Set auto-expiry from 1h to 30d.' },
                        { icon: <History size={18} />, title: 'Version history', desc: 'Every edit saved. Compare and restore any version.' },
                        { icon: <BarChart3 size={18} />, title: 'View analytics', desc: 'Track total views, unique visitors, and daily trends.' },
                        { icon: <Wand2 size={18} />, title: 'AI assistant', desc: 'Summarize, expand, fix grammar, translate, generate tables.' },
                        { icon: <Terminal size={18} />, title: 'CLI & API', desc: 'Share from CI/CD, scripts, or AI agents. Full REST API.' },
                    ].map(f => (
                        <div key={f.title} className={styles.fCard}>
                            <div className={styles.fIcon}>{f.icon}</div>
                            <div>
                                <h3 className={styles.fTitle}>{f.title}</h3>
                                <p className={styles.fDesc}>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className={styles.ctaSection}>
                <h2 className={styles.ctaH}>Start sharing</h2>
                <p className={styles.ctaSub}>No signup required. Write and share in seconds.</p>
                <div className={styles.ctaBtns}>
                    <Link href="/" className={styles.btnPrimary}>
                        Open Editor <ArrowRight size={15} />
                    </Link>
                    <Link href="/login" className={styles.btnGhost}>Sign in</Link>
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

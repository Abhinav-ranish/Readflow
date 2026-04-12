'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Terminal, Globe, ArrowRight, Copy, Check } from 'lucide-react';
import styles from './demo.module.css';

const CLI_LINES = [
    { type: 'prompt', text: '$ npx readflow-md share README.md' },
    { type: 'blank', text: '' },
    { type: 'output', text: '  ✓ Shared successfully!' },
    { type: 'blank', text: '' },
    { type: 'link', text: '  URL: https://readflow.aranish.uk/s/abc123' },
    { type: 'output', text: '  👤 Posted to your account' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ npx readflow-md login' },
    { type: 'blank', text: '' },
    { type: 'output', text: '  Starting browser login...' },
    { type: 'output', text: '  Browser opened! Approve the login there.' },
    { type: 'blank', text: '' },
    { type: 'output', text: '  ✓ Logged in as dev@example.com' },
    { type: 'output', text: '  All shares will be linked to your account.' },
];

const WEB_STEPS = [
    {
        label: 'Write',
        title: 'Write your markdown',
        desc: 'Full-featured editor with live preview, AI assist, and keyboard shortcuts.',
        mock: '# My Project\n\n## Getting Started\n\n```bash\nnpm install my-project\n```\n\nWelcome to the **best** project ever.\n\n- Fast\n- Simple\n- Beautiful',
    },
    {
        label: 'Share',
        title: 'Share instantly',
        desc: 'One click to get a shareable link. Optional password protection and expiry.',
        mock: null,
    },
    {
        label: 'Manage',
        title: 'Manage from your dashboard',
        desc: 'Organize documents into projects, track views, manage versions, and collaborate.',
        mock: null,
    },
];

export default function DemoPage() {
    const [activeTab, setActiveTab] = useState<'web' | 'cli'>('web');
    const [webStep, setWebStep] = useState(0);
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>R</span>
                    <span className={styles.logoText}>Readflow</span>
                </Link>
                <div className={styles.headerLinks}>
                    <Link href="/login" className={styles.headerLink}>Log in</Link>
                    <Link href="/" className={styles.headerCta}>Try it</Link>
                </div>
            </header>

            <section className={styles.hero}>
                <h1 className={styles.heroTitle}>See Readflow in action</h1>
                <p className={styles.heroDesc}>
                    Share markdown files from the browser or the terminal — your docs, your way.
                </p>
            </section>

            {/* Tab switcher */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'web' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('web')}
                >
                    <Globe size={15} /> Web App
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'cli' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('cli')}
                >
                    <Terminal size={15} /> CLI
                </button>
            </div>

            {/* Web demo */}
            {activeTab === 'web' && (
                <div className={styles.demoSection}>
                    <div className={styles.stepNav}>
                        {WEB_STEPS.map((s, i) => (
                            <button
                                key={s.label}
                                className={`${styles.stepBtn} ${webStep === i ? styles.stepActive : ''}`}
                                onClick={() => setWebStep(i)}
                            >
                                <span className={styles.stepNum}>{i + 1}</span>
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.webDemo}>
                        <div className={styles.webInfo}>
                            <h3 className={styles.webTitle}>{WEB_STEPS[webStep].title}</h3>
                            <p className={styles.webDesc}>{WEB_STEPS[webStep].desc}</p>
                        </div>

                        <div className={styles.browserMock}>
                            <div className={styles.browserBar}>
                                <div className={styles.browserDots}>
                                    <span /><span /><span />
                                </div>
                                <div className={styles.browserUrl}>
                                    {webStep === 0 && 'readflow.aranish.uk'}
                                    {webStep === 1 && 'readflow.aranish.uk/s/abc123'}
                                    {webStep === 2 && 'readflow.aranish.uk/dashboard'}
                                </div>
                            </div>
                            <div className={styles.browserContent}>
                                {webStep === 0 && (
                                    <div className={styles.editorMock}>
                                        <div className={styles.editorPane}>
                                            <div className={styles.editorLabel}>Editor</div>
                                            <div className={styles.editorCode}>
                                                {WEB_STEPS[0].mock?.split('\n').map((line, i) => (
                                                    <div key={i} className={styles.codeLine}>
                                                        <span className={styles.lineNum}>{i + 1}</span>
                                                        <span className={styles.lineText}>{line || '\u00A0'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={styles.previewPane}>
                                            <div className={styles.editorLabel}>Preview</div>
                                            <div className={styles.previewContent}>
                                                <h2 className={styles.mockH1}>My Project</h2>
                                                <h3 className={styles.mockH2}>Getting Started</h3>
                                                <div className={styles.mockCode}>npm install my-project</div>
                                                <p className={styles.mockP}>Welcome to the <strong>best</strong> project ever.</p>
                                                <ul className={styles.mockList}>
                                                    <li>Fast</li><li>Simple</li><li>Beautiful</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {webStep === 1 && (
                                    <div className={styles.shareMock}>
                                        <div className={styles.shareModal}>
                                            <div className={styles.shareTitle}>Share this document</div>
                                            <div className={styles.shareUrl}>
                                                <code>readflow.aranish.uk/s/abc123</code>
                                                <button className={styles.shareCopy}><Copy size={12} /></button>
                                            </div>
                                            <div className={styles.shareOptions}>
                                                <label className={styles.shareOption}>
                                                    <span className={styles.optionDot} /> Password protect
                                                </label>
                                                <label className={styles.shareOption}>
                                                    <span className={styles.optionDot} /> Set expiry
                                                </label>
                                            </div>
                                            <div className={styles.shareBtn}>Copy Link</div>
                                        </div>
                                    </div>
                                )}
                                {webStep === 2 && (
                                    <div className={styles.dashMock}>
                                        <div className={styles.dashHeader}>
                                            <span className={styles.dashTitle}>Documents</span>
                                            <span className={styles.dashNew}>+ New</span>
                                        </div>
                                        <div className={styles.dashGrid}>
                                            {['README.md', 'API Docs', 'Changelog', 'Setup Guide'].map((name, i) => (
                                                <div key={name} className={styles.dashFile} style={{ animationDelay: `${i * 0.1}s` }}>
                                                    <div className={styles.dashFileThumb}>
                                                        <div className={styles.dashFileLine} style={{ width: '80%' }} />
                                                        <div className={styles.dashFileLine} style={{ width: '60%' }} />
                                                        <div className={styles.dashFileLine} style={{ width: '90%' }} />
                                                        <div className={styles.dashFileLine} style={{ width: '45%' }} />
                                                    </div>
                                                    <span className={styles.dashFileName}>{name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CLI demo */}
            {activeTab === 'cli' && (
                <div className={styles.demoSection}>
                    <div className={styles.cliInfo}>
                        <h3 className={styles.cliTitle}>Share from your terminal</h3>
                        <p className={styles.cliDesc}>Install globally or use with npx — no config needed.</p>
                        <div className={styles.installCmd}>
                            <code>npm install -g readflow-md</code>
                            <button
                                className={styles.installCopy}
                                onClick={() => handleCopy('npm install -g readflow-md')}
                            >
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.terminalMock}>
                        <div className={styles.terminalBar}>
                            <div className={styles.browserDots}>
                                <span /><span /><span />
                            </div>
                            <span className={styles.terminalTitle}>Terminal</span>
                        </div>
                        <div className={styles.terminalBody}>
                            {CLI_LINES.map((line, i) => (
                                <div
                                    key={i}
                                    className={`${styles.termLine} ${styles[`termType_${line.type}`]}`}
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                >
                                    {line.text}
                                </div>
                            ))}
                            <div className={styles.termCursor} style={{ animationDelay: `${CLI_LINES.length * 0.15}s` }}>
                                <span className={styles.cursor}>$</span>
                                <span className={styles.cursorBlink} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CTA */}
            <section className={styles.cta}>
                <h2 className={styles.ctaTitle}>Ready to share?</h2>
                <div className={styles.ctaBtns}>
                    <Link href="/" className={styles.ctaPrimary}>
                        Open Editor <ArrowRight size={15} />
                    </Link>
                    <Link href="/login" className={styles.ctaSecondary}>
                        Sign in
                    </Link>
                </div>
            </section>

            <footer className={styles.footer}>
                <span>Readflow</span>
                <span className={styles.footerDot} />
                <Link href="/">Editor</Link>
                <span className={styles.footerDot} />
                <a href="https://www.npmjs.com/package/readflow-md" target="_blank" rel="noopener noreferrer">npm</a>
            </footer>
        </div>
    );
}

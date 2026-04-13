'use client';
import React, { useState, useEffect } from 'react';
import { X, Pencil, Eye, Share2, Sparkles, ArrowRight } from 'lucide-react';
import styles from './FirstRunGuide.module.css';

const STEPS = [
    {
        icon: Pencil,
        title: 'Write',
        desc: 'Type Markdown on the left — headers, lists, code blocks, tables, even Mermaid diagrams.',
        hint: 'Try pasting some Markdown or pick a template from the top bar.',
    },
    {
        icon: Eye,
        title: 'Preview',
        desc: 'Your formatted output renders live on the right. What you see is what readers get.',
        hint: 'Toggle between split, editor-only, and preview-only layouts.',
    },
    {
        icon: Share2,
        title: 'Share',
        desc: 'Hit Share to get a read-only link instantly. Add a password, set an expiry, or choose a custom slug.',
        hint: 'Your doc gets its own URL — share it anywhere.',
    },
    {
        icon: Sparkles,
        title: 'AI Assist',
        desc: 'Use the AI button to summarize, expand, polish, translate, or chat about your document.',
        hint: 'Powered by GPT-4o, Claude, and Gemini.',
    },
];

export default function FirstRunGuide() {
    const [step, setStep] = useState(-1);

    useEffect(() => {
        if (localStorage.getItem('readex_onboarded')) return;
        const timer = setTimeout(() => setStep(0), 800);
        return () => clearTimeout(timer);
    }, []);

    const dismiss = () => {
        setStep(-1);
        localStorage.setItem('readex_onboarded', '1');
    };

    const next = () => {
        if (step >= STEPS.length - 1) {
            dismiss();
        } else {
            setStep(step + 1);
        }
    };

    const prev = () => {
        if (step > 0) setStep(step - 1);
    };

    if (step < 0) return null;

    const current = STEPS[step];
    const Icon = current.icon;

    return (
        <div className={styles.overlay} onClick={dismiss}>
            <div className={styles.card} onClick={e => e.stopPropagation()}>
                <button className={styles.close} onClick={dismiss} aria-label="Skip"><X size={16} /></button>

                <div className={styles.iconBadge}>
                    <Icon size={24} />
                </div>

                <div className={styles.stepIndicator}>
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            className={`${styles.dot} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`}
                            onClick={() => setStep(i)}
                            aria-label={`Step ${i + 1}`}
                        />
                    ))}
                </div>

                <h3 className={styles.stepTitle}>{current.title}</h3>
                <p className={styles.stepDesc}>{current.desc}</p>
                <p className={styles.stepHint}>{current.hint}</p>

                <div className={styles.actions}>
                    {step > 0 ? (
                        <button className={styles.backBtn} onClick={prev}>Back</button>
                    ) : (
                        <button className={styles.skipBtn} onClick={dismiss}>Skip tour</button>
                    )}
                    <button className={styles.nextBtn} onClick={next}>
                        {step >= STEPS.length - 1 ? 'Get started' : (
                            <>Next <ArrowRight size={14} /></>
                        )}
                    </button>
                </div>

                <div className={styles.counter}>{step + 1} of {STEPS.length}</div>
            </div>
        </div>
    );
}

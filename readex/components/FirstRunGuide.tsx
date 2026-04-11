'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './FirstRunGuide.module.css';

const STEPS = [
    { target: 'editor', title: 'Write', desc: 'Type Markdown in the editor on the left.' },
    { target: 'preview', title: 'Preview', desc: 'See your formatted output live on the right.' },
    { target: 'share', title: 'Share', desc: 'Hit Share to get a read-only link instantly.' },
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

    if (step < 0) return null;

    const current = STEPS[step];

    return (
        <div className={styles.overlay} onClick={dismiss}>
            <div className={styles.tooltip} onClick={e => e.stopPropagation()}>
                <button className={styles.close} onClick={dismiss} aria-label="Skip"><X size={16} /></button>
                <div className={styles.stepIndicator}>
                    {STEPS.map((_, i) => (
                        <span key={i} className={`${styles.dot} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`} />
                    ))}
                </div>
                <h3 className={styles.stepTitle}>{current.title}</h3>
                <p className={styles.stepDesc}>{current.desc}</p>
                <div className={styles.actions}>
                    <button className={styles.skipBtn} onClick={dismiss}>Skip</button>
                    <button className={styles.nextBtn} onClick={next}>
                        {step >= STEPS.length - 1 ? 'Got it' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}

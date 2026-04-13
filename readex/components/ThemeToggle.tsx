'use client';
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import styles from './ThemeToggle.module.css';

function getSystemTheme(): 'dark' | 'light' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getStoredTheme(): 'dark' | 'light' | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('readex_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return null;
}

function applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const stored = getStoredTheme();
        const resolved = stored ?? getSystemTheme();
        setTheme(resolved);
        applyTheme(resolved);

        if (!stored) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => {
                const s = getStoredTheme();
                if (!s) {
                    const sys = mq.matches ? 'dark' : 'light';
                    setTheme(sys);
                    applyTheme(sys);
                }
            };
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, []);

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('readex_theme', next);
        setTheme(next);
        applyTheme(next);
    };

    return { theme, toggle };
}

export default function ThemeToggle() {
    const { theme, toggle } = useTheme();

    return (
        <button className={styles.toggle} onClick={toggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
}

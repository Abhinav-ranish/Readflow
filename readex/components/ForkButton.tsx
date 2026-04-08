'use client';
import React, { useState } from 'react';
import { GitFork, Check } from 'lucide-react';
import styles from './ForkButton.module.css';

interface ForkButtonProps {
    content: string;
}

export default function ForkButton({ content }: ForkButtonProps) {
    const [forked, setForked] = useState(false);

    const handleFork = () => {
        localStorage.setItem('readex_draft', content);
        setForked(true);
        setTimeout(() => {
            window.location.href = '/';
        }, 600);
    };

    return (
        <button
            className={styles.forkButton}
            onClick={handleFork}
            disabled={forked}
            title="Copy this document into your editor"
        >
            {forked ? <Check size={16} /> : <GitFork size={16} />}
            <span>{forked ? 'Forked!' : 'Fork'}</span>
        </button>
    );
}

'use client';
import React, { useState, useEffect } from 'react';
import styles from './loading.module.css';

const phrases = [
    'Fetching the document...',
    'Pulling from the void...',
    'Churning the markdown...',
    'Smashing bits together...',
    'Reticulating splines...',
    'Parsing the chaos...',
    'Hydrating the content...',
    'Compiling thoughts...',
    'Defragmenting paragraphs...',
    'Warming up the render engine...',
    'Untangling the syntax tree...',
    'Negotiating with the database...',
    'Decompressing knowledge...',
    'Assembling the pixels...',
    'Spinning up the hamster wheel...',
    'Consulting the markdown gods...',
    'Resolving merge conflicts with reality...',
    'Piping content through the tubes...',
    'Waking up the serverless function...',
    'Deploying to your eyeballs...',
];

export default function Loading() {
    const [index, setIndex] = useState(() => Math.floor(Math.random() * phrases.length));
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setIndex(prev => (prev + 1) % phrases.length);
                setFade(true);
            }, 200);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.loading}>
            <div className={styles.spinner}>
                <div className={styles.ring} />
                <div className={`${styles.ring} ${styles.ring2}`} />
                <div className={styles.glow} />
                <span className={styles.logo}>R</span>
            </div>
            <span className={`${styles.phrase} ${fade ? styles.visible : ''}`}>
                {phrases[index]}
            </span>
            <div className={styles.dots}>
                <span /><span /><span />
            </div>
        </div>
    );
}

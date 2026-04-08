'use client';
import React from 'react';
import styles from './PoweredByFooter.module.css';

export default function PoweredByFooter() {
    return (
        <footer className={styles.footer}>
            <a
                href="/"
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
            >
                Made with <span className={styles.brand}>Readflow</span> — Create yours free
            </a>
        </footer>
    );
}

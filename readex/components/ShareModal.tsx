'use client';
import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import styles from './ShareModal.module.css';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
}

export default function ShareModal({ isOpen, onClose, url }: ShareModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className={styles.overlay} onClick={(e) => {
            // Close if clicking the backdrop
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>

                <h3 className={styles.title}>Share your README</h3>
                <p className={styles.subtitle}>Anyone with this link can view your document.</p>

                <div className={styles.inputGroup}>
                    <input
                        type="text"
                        value={url}
                        readOnly
                        className={styles.input}
                        onClick={(e) => e.currentTarget.select()}
                    />
                    <button className={styles.copyButton} onClick={handleCopy}>
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

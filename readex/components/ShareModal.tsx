'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import styles from './ShareModal.module.css';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
}

export default function ShareModal({ isOpen, onClose, url }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Focus the input when modal opens
            setTimeout(() => inputRef.current?.select(), 100);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

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
        <div
            className={styles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
        >
            <div className={styles.modal} ref={modalRef}>
                <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>

                <h3 className={styles.title} id="share-modal-title">Share your README</h3>
                <p className={styles.subtitle}>Anyone with this link can view your document.</p>

                <div className={styles.inputGroup}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={url}
                        readOnly
                        className={styles.input}
                        onClick={(e) => e.currentTarget.select()}
                        aria-label="Share URL"
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

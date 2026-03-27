'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import styles from './ShareModal.module.css';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    onShare: (title: string) => void;
    isSharing: boolean;
}

export default function ShareModal({ isOpen, onClose, url, onShare, isSharing }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [title, setTitle] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const urlInputRef = useRef<HTMLInputElement>(null);

    const hasUrl = url.length > 0;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            // Focus title input if no URL yet, otherwise focus URL
            setTimeout(() => {
                if (hasUrl) {
                    urlInputRef.current?.select();
                } else {
                    titleInputRef.current?.focus();
                }
            }, 100);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown, hasUrl]);

    // Reset title when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setCopied(false);
        }
    }, [isOpen]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onShare(title.trim());
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

                <h3 className={styles.title} id="share-modal-title">
                    {hasUrl ? 'Your link is ready' : 'Share your document'}
                </h3>

                {!hasUrl ? (
                    <>
                        <p className={styles.subtitle}>
                            Give it a title so downloads are named properly. Optional.
                        </p>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.titleGroup}>
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Project Setup Guide"
                                    className={styles.titleInput}
                                    maxLength={100}
                                    aria-label="Document title"
                                />
                            </div>
                            <button
                                type="submit"
                                className={styles.shareSubmitButton}
                                disabled={isSharing}
                            >
                                <Share2 size={16} />
                                {isSharing ? 'Creating link...' : 'Create share link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <p className={styles.subtitle}>Anyone with this link can view your document.</p>
                        <div className={styles.inputGroup}>
                            <input
                                ref={urlInputRef}
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
                    </>
                )}
            </div>
        </div>
    );
}

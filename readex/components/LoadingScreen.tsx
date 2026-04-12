'use client';
import React from 'react';

interface LoadingScreenProps {
    text?: string;
    compact?: boolean;
}

export default function LoadingScreen({ text, compact = false }: LoadingScreenProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: compact ? 'auto' : '60vh',
            gap: '1.5rem',
            padding: compact ? '3rem 1rem' : 0,
        }}>
            <div className="rf-loader">
                <div className="rf-loader-ring" />
                <div className="rf-loader-ring rf-loader-ring-2" />
                <div className="rf-loader-glow" />
                <span className="rf-loader-logo">R</span>
            </div>
            {text && <span className="rf-loader-text">{text}</span>}

            <style jsx>{`
                .rf-loader {
                    position: relative;
                    width: 64px;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .rf-loader-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 2px solid transparent;
                    border-top-color: rgba(56, 139, 253, 0.8);
                    border-right-color: rgba(56, 139, 253, 0.3);
                    animation: rf-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }

                .rf-loader-ring-2 {
                    inset: 6px;
                    border-top-color: rgba(139, 92, 246, 0.7);
                    border-right-color: rgba(139, 92, 246, 0.2);
                    animation-duration: 1.8s;
                    animation-direction: reverse;
                }

                .rf-loader-glow {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(56, 139, 253, 0.15) 0%, transparent 70%);
                    animation: rf-pulse 2s ease-in-out infinite;
                }

                .rf-loader-logo {
                    position: relative;
                    z-index: 1;
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: var(--fg-primary, #e6edf3);
                    font-family: var(--font-sans, system-ui);
                    opacity: 0.9;
                    animation: rf-fade 2s ease-in-out infinite;
                }

                .rf-loader-text {
                    font-size: 0.82rem;
                    color: var(--fg-muted, #8b949e);
                    letter-spacing: 0.03em;
                    animation: rf-fade 2s ease-in-out infinite;
                }

                @keyframes rf-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes rf-pulse {
                    0%, 100% { transform: scale(0.8); opacity: 0.4; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                }

                @keyframes rf-fade {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

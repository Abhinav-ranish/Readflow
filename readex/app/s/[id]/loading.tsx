'use client';
import React, { useState, useEffect } from 'react';

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
        <div className="doc-loading">
            <div className="doc-loading-spinner">
                <div className="doc-loading-ring" />
                <div className="doc-loading-ring doc-loading-ring-2" />
                <div className="doc-loading-glow" />
                <span className="doc-loading-logo">R</span>
            </div>
            <span className={`doc-loading-phrase ${fade ? 'visible' : ''}`}>
                {phrases[index]}
            </span>
            <div className="doc-loading-dots">
                <span /><span /><span />
            </div>

            <style jsx>{`
                .doc-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: var(--bg-primary, #0d1117);
                    gap: 1.8rem;
                }

                .doc-loading-spinner {
                    position: relative;
                    width: 72px;
                    height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .doc-loading-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 2.5px solid transparent;
                    border-top-color: rgba(56, 139, 253, 0.85);
                    border-right-color: rgba(56, 139, 253, 0.3);
                    animation: doc-spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }

                .doc-loading-ring-2 {
                    inset: 7px;
                    border-top-color: rgba(139, 92, 246, 0.75);
                    border-right-color: rgba(139, 92, 246, 0.2);
                    animation-duration: 1.8s;
                    animation-direction: reverse;
                }

                .doc-loading-glow {
                    position: absolute;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(56, 139, 253, 0.18) 0%, transparent 70%);
                    animation: doc-pulse 2s ease-in-out infinite;
                }

                .doc-loading-logo {
                    position: relative;
                    z-index: 1;
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: var(--fg-primary, #e6edf3);
                    font-family: var(--font-sans, system-ui);
                    animation: doc-fade 2s ease-in-out infinite;
                }

                .doc-loading-phrase {
                    font-size: 0.88rem;
                    color: var(--fg-muted, #8b949e);
                    letter-spacing: 0.02em;
                    transition: opacity 0.2s ease;
                    opacity: 0;
                    min-height: 1.4em;
                }

                .doc-loading-phrase.visible {
                    opacity: 1;
                }

                .doc-loading-dots {
                    display: flex;
                    gap: 6px;
                }

                .doc-loading-dots span {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: rgba(56, 139, 253, 0.5);
                    animation: doc-bounce 1.4s ease-in-out infinite;
                }

                .doc-loading-dots span:nth-child(2) {
                    animation-delay: 0.15s;
                }

                .doc-loading-dots span:nth-child(3) {
                    animation-delay: 0.3s;
                }

                @keyframes doc-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes doc-pulse {
                    0%, 100% { transform: scale(0.8); opacity: 0.4; }
                    50% { transform: scale(1.3); opacity: 0.9; }
                }

                @keyframes doc-fade {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }

                @keyframes doc-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

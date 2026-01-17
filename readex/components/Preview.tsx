'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import styles from './Preview.module.css';
import 'highlight.js/styles/github-dark.css'; // Import syntax highlighter styles

interface PreviewProps {
    content: string;
    className?: string;
}

export default function Preview({ content, className }: PreviewProps) {
    return (
        <div className={`${styles.previewContainer} ${className}`}>
            <div className={styles.markdownBody}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}

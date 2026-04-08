'use client';
import React, { useEffect, useRef, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import styles from './Preview.module.css';
import 'highlight.js/styles/github-dark.css';

// Extend the default sanitize schema to allow HTML commonly found in GitHub READMEs
const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'details', 'summary',
        'kbd', 'samp', 'var', 'mark', 'ruby', 'rt', 'rp',
        'abbr', 'bdo', 'cite', 'dfn', 'ins', 'wbr',
        'picture', 'source',
        'figure', 'figcaption',
        'video', 'audio',
        'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'use', 'text', 'tspan',
    ],
    attributes: {
        ...defaultSchema.attributes,
        '*': [
            ...(defaultSchema.attributes?.['*'] || []),
            'align', 'valign',
            'className', 'class',
            'dir', 'lang', 'title', 'role', 'aria-*',
        ],
        img: [
            ...(defaultSchema.attributes?.['img'] || []),
            'src', 'alt', 'width', 'height', 'loading',
        ],
        a: [
            ...(defaultSchema.attributes?.['a'] || []),
            'href', 'target', 'rel',
        ],
        td: [...(defaultSchema.attributes?.['td'] || []), 'align', 'valign', 'colspan', 'rowspan'],
        th: [...(defaultSchema.attributes?.['th'] || []), 'align', 'valign', 'colspan', 'rowspan'],
        details: ['open'],
        source: ['src', 'type', 'media', 'srcSet', 'sizes'],
        video: ['src', 'poster', 'controls', 'width', 'height', 'autoPlay', 'loop', 'muted'],
        audio: ['src', 'controls'],
        abbr: ['title'],
        svg: ['viewBox', 'width', 'height', 'xmlns', 'fill', 'stroke'],
        path: ['d', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'],
        circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
        rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
        line: ['x1', 'y1', 'x2', 'y2', 'stroke'],
    },
};

// Mermaid diagram component — renders lazily on mount
function MermaidBlock({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const uniqueId = useId();
    const mermaidId = `mermaid-${uniqueId.replace(/:/g, '')}`;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const mermaid = (await import('mermaid')).default;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    themeVariables: {
                        darkMode: true,
                        background: '#1c2128',
                        primaryColor: '#316dca',
                        primaryTextColor: '#adbac7',
                        primaryBorderColor: '#444c56',
                        lineColor: '#768390',
                        secondaryColor: '#2d333b',
                        tertiaryColor: '#2d333b',
                    },
                    securityLevel: 'strict',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                });

                const { svg } = await mermaid.render(mermaidId, chart);
                if (!cancelled && containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            } catch {
                // If mermaid fails to parse, fall back to showing the source
                if (!cancelled && containerRef.current) {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.textContent = chart;
                    pre.appendChild(code);
                    containerRef.current.appendChild(pre);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [chart, mermaidId]);

    return (
        <div
            ref={containerRef}
            className={styles.mermaidContainer}
        />
    );
}

// Custom component overrides for react-markdown
const markdownComponents: Components = {
    code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const lang = match?.[1];
        const codeString = String(children).replace(/\n$/, '');

        // Render mermaid code blocks as diagrams
        if (lang === 'mermaid') {
            return <MermaidBlock chart={codeString} />;
        }

        // Inline code (no language class) vs block code
        const isInline = !className;
        if (isInline) {
            return <code className={className} {...props}>{children}</code>;
        }

        return (
            <code className={className} {...props}>
                {children}
            </code>
        );
    },
};

interface PreviewProps {
    content: string;
    className?: string;
}

export default function Preview({ content, className }: PreviewProps) {
    return (
        <div className={`${styles.previewContainer}${className ? ` ${className}` : ''}`}>
            <div className={styles.markdownBody} data-preview-content>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight]}
                    components={markdownComponents}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}

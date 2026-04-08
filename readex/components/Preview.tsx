'use client';
import React, { useEffect, useRef, useId, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
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

const PAN_STEP = 80;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// Mermaid diagram component with pan/zoom controls
function MermaidBlock({ chart }: { chart: string }) {
    const svgRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const uniqueId = useId();
    const mermaidId = `mermaid-${uniqueId.replace(/:/g, '')}`;

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [rendered, setRendered] = useState(false);

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
                if (!cancelled && svgRef.current) {
                    svgRef.current.innerHTML = svg;
                    setRendered(true);
                }
            } catch {
                if (!cancelled && svgRef.current) {
                    const pre = document.createElement('pre');
                    const code = document.createElement('code');
                    code.textContent = chart;
                    pre.appendChild(code);
                    svgRef.current.appendChild(pre);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [chart, mermaidId]);

    const handleZoomIn = useCallback(() => {
        setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
    }, []);

    const handleReset = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const handleFitToView = useCallback(() => {
        if (!svgRef.current || !viewportRef.current) return;
        const svg = svgRef.current.querySelector('svg');
        if (!svg) return;
        const svgRect = svg.getBoundingClientRect();
        const vpRect = viewportRef.current.getBoundingClientRect();
        const scaleX = vpRect.width / svgRect.width;
        const scaleY = vpRect.height / svgRect.height;
        const fitZoom = Math.min(scaleX, scaleY, MAX_ZOOM) * zoom;
        setZoom(Math.max(MIN_ZOOM, Math.min(fitZoom, MAX_ZOOM)));
        setPan({ x: 0, y: 0 });
    }, [zoom]);

    // Mouse drag to pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    }, [dragging]);

    const handleMouseUp = useCallback(() => {
        setDragging(false);
    }, []);

    // Scroll wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(z => Math.max(MIN_ZOOM, Math.min(z + delta, MAX_ZOOM)));
    }, []);

    const panUp = useCallback(() => setPan(p => ({ ...p, y: p.y + PAN_STEP })), []);
    const panDown = useCallback(() => setPan(p => ({ ...p, y: p.y - PAN_STEP })), []);
    const panLeft = useCallback(() => setPan(p => ({ ...p, x: p.x + PAN_STEP })), []);
    const panRight = useCallback(() => setPan(p => ({ ...p, x: p.x - PAN_STEP })), []);

    return (
        <div className={styles.mermaidWrapper}>
            <div
                ref={viewportRef}
                className={styles.mermaidViewport}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            >
                <div
                    ref={svgRef}
                    className={styles.mermaidContent}
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }}
                />
            </div>

            {rendered && (
                <div className={styles.mermaidControls}>
                    {/* Top row: up + zoom in */}
                    <div className={styles.mermaidControlRow}>
                        <button className={styles.mermaidBtn} onClick={panUp} title="Pan up">
                            <ChevronUp size={14} />
                        </button>
                        <button className={styles.mermaidBtn} onClick={handleZoomIn} title="Zoom in">
                            <ZoomIn size={14} />
                        </button>
                    </div>
                    {/* Middle row: left + reset + right */}
                    <div className={styles.mermaidControlRow}>
                        <button className={styles.mermaidBtn} onClick={panLeft} title="Pan left">
                            <ChevronLeft size={14} />
                        </button>
                        <button className={styles.mermaidBtn} onClick={handleReset} title="Reset view">
                            <RotateCcw size={14} />
                        </button>
                        <button className={styles.mermaidBtn} onClick={panRight} title="Pan right">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                    {/* Bottom row: down + zoom out */}
                    <div className={styles.mermaidControlRow}>
                        <button className={styles.mermaidBtn} onClick={panDown} title="Pan down">
                            <ChevronDown size={14} />
                        </button>
                        <button className={styles.mermaidBtn} onClick={handleZoomOut} title="Zoom out">
                            <ZoomOut size={14} />
                        </button>
                    </div>
                    {/* Fit to view */}
                    <div className={styles.mermaidControlRow}>
                        <button className={styles.mermaidBtn} onClick={handleFitToView} title="Fit to view">
                            <Maximize2 size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
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
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight]}
                    components={markdownComponents}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}

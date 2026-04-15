'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Network } from 'lucide-react';
import styles from './GraphView.module.css';

interface GraphNode {
    id: string;
    title: string;
    linkCount: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

interface GraphEdge {
    source: string;
    target: string;
    label?: string;
}

interface GraphViewProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    onNodeClick?: (nodeId: string) => void;
}

// Simple force simulation (no d3 dependency)
function simulate(
    nodes: GraphNode[],
    edges: GraphEdge[],
    width: number,
    height: number,
    iterations: number = 100
) {
    const nodeMap = new Map<string, GraphNode>();

    // Initialize positions in a circle
    nodes.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / nodes.length;
        const radius = Math.min(width, height) * 0.3;
        n.x = width / 2 + radius * Math.cos(angle);
        n.y = height / 2 + radius * Math.sin(angle);
        n.vx = 0;
        n.vy = 0;
        nodeMap.set(n.id, n);
    });

    for (let iter = 0; iter < iterations; iter++) {
        const alpha = 1 - iter / iterations;
        const strength = alpha * 0.1;

        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                let dx = (b.x! - a.x!) || 0.01;
                let dy = (b.y! - a.y!) || 0.01;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const force = 800 / (dist * dist + 1);
                const fx = (dx / dist) * force * strength;
                const fy = (dy / dist) * force * strength;
                a.vx! -= fx; a.vy! -= fy;
                b.vx! += fx; b.vy! += fy;
            }
        }

        // Attraction along edges
        for (const edge of edges) {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) continue;
            const dx = b.x! - a.x!;
            const dy = b.y! - a.y!;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const force = (dist - 120) * 0.005 * alpha;
            const fx = (dx / (dist || 1)) * force;
            const fy = (dy / (dist || 1)) * force;
            a.vx! += fx; a.vy! += fy;
            b.vx! -= fx; b.vy! -= fy;
        }

        // Center gravity
        for (const n of nodes) {
            n.vx! += (width / 2 - n.x!) * 0.001 * alpha;
            n.vy! += (height / 2 - n.y!) * 0.001 * alpha;
        }

        // Apply velocities with damping
        for (const n of nodes) {
            n.vx! *= 0.85;
            n.vy! *= 0.85;
            n.x! += n.vx!;
            n.y! += n.vy!;
            // Keep in bounds
            n.x = Math.max(30, Math.min(width - 30, n.x!));
            n.y = Math.max(30, Math.min(height - 30, n.y!));
        }
    }

    return nodes;
}

export default function GraphView({ nodes, edges, onNodeClick }: GraphViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; linkCount: number } | null>(null);
    const dragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const simulatedNodes = useRef<GraphNode[]>([]);

    const getThemeColors = useCallback(() => {
        if (typeof window === 'undefined') return { fg: '#adbac7', fgMuted: '#768390', accent: '#388bfd', bg: '#1c2128', border: '#444c56', nodeBg: '#2d333b' };
        const cs = getComputedStyle(document.documentElement);
        return {
            fg: cs.getPropertyValue('--fg-primary').trim() || '#adbac7',
            fgMuted: cs.getPropertyValue('--fg-muted').trim() || '#768390',
            accent: cs.getPropertyValue('--accent-primary').trim() || '#388bfd',
            bg: cs.getPropertyValue('--bg-primary').trim() || '#1c2128',
            border: cs.getPropertyValue('--border-subtle').trim() || '#444c56',
            nodeBg: cs.getPropertyValue('--bg-tertiary').trim() || '#2d333b',
        };
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const colors = getThemeColors();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        const nodeMap = new Map<string, GraphNode>();
        for (const n of simulatedNodes.current) nodeMap.set(n.id, n);

        // Draw edges
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5;
        for (const edge of edges) {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(a.x!, a.y!);
            ctx.lineTo(b.x!, b.y!);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Draw nodes
        for (const node of simulatedNodes.current) {
            const radius = Math.max(8, Math.min(20, 8 + node.linkCount * 3));

            // Node circle
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2);
            ctx.fillStyle = node.linkCount > 0 ? colors.accent : colors.nodeBg;
            ctx.fill();
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = '11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = colors.fg;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const label = node.title.length > 20 ? node.title.slice(0, 18) + '...' : node.title;
            ctx.fillText(label, node.x!, node.y! + radius + 4);
        }

        ctx.restore();
    }, [edges, zoom, pan, getThemeColors]);

    // Run simulation when nodes/edges change
    useEffect(() => {
        if (nodes.length === 0) return;
        const container = containerRef.current;
        const w = container?.clientWidth || 600;
        const h = container?.clientHeight || 400;
        const cloned = nodes.map(n => ({ ...n }));
        simulatedNodes.current = simulate(cloned, edges, w, h);
        draw();
    }, [nodes, edges, draw]);

    // Redraw on zoom/pan change
    useEffect(() => { draw(); }, [draw]);

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => draw());
        ro.observe(container);
        return () => ro.disconnect();
    }, [draw]);

    // Mouse handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        dragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (dragging.current) {
            setPan({
                x: dragStart.current.panX + (e.clientX - dragStart.current.x),
                y: dragStart.current.panY + (e.clientY - dragStart.current.y),
            });
            setTooltip(null);
            return;
        }

        // Hit test for tooltip
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - pan.x) / zoom;
        const my = (e.clientY - rect.top - pan.y) / zoom;

        let found = false;
        for (const node of simulatedNodes.current) {
            const dx = mx - node.x!;
            const dy = my - node.y!;
            const radius = Math.max(8, Math.min(20, 8 + node.linkCount * 3));
            if (dx * dx + dy * dy < (radius + 4) * (radius + 4)) {
                setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, title: node.title, linkCount: node.linkCount });
                canvas.style.cursor = 'pointer';
                found = true;
                break;
            }
        }
        if (!found) {
            setTooltip(null);
            canvas.style.cursor = dragging.current ? 'grabbing' : 'grab';
        }
    }, [pan, zoom]);

    const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (!onNodeClick) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - pan.x) / zoom;
        const my = (e.clientY - rect.top - pan.y) / zoom;

        for (const node of simulatedNodes.current) {
            const dx = mx - node.x!;
            const dy = my - node.y!;
            const radius = Math.max(8, Math.min(20, 8 + node.linkCount * 3));
            if (dx * dx + dy * dy < (radius + 4) * (radius + 4)) {
                onNodeClick(node.id);
                break;
            }
        }
    }, [onNodeClick, pan, zoom]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(z => Math.max(0.2, Math.min(3, z + delta)));
    }, []);

    if (nodes.length === 0) {
        return (
            <div className={styles.empty}>
                <Network size={40} strokeWidth={1.2} />
                <span className={styles.emptyTitle}>No connections yet</span>
                <p>Use [[wiki-links]] in your documents to connect them. The graph will appear here.</p>
            </div>
        );
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseUp(); setTooltip(null); }}
                onClick={handleClick}
                onWheel={handleWheel}
            />

            {tooltip && (
                <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
                    <div className={styles.tooltipTitle}>{tooltip.title}</div>
                    <div className={styles.tooltipMeta}>{tooltip.linkCount} connection{tooltip.linkCount !== 1 ? 's' : ''}</div>
                </div>
            )}

            <div className={styles.controls}>
                <button className={styles.controlBtn} onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom in">
                    <ZoomIn size={14} />
                </button>
                <button className={styles.controlBtn} onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} title="Zoom out">
                    <ZoomOut size={14} />
                </button>
                <button className={styles.controlBtn} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view">
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
}

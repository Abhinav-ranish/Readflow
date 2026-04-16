'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Network, Maximize2 } from 'lucide-react';
import styles from './GraphView.module.css';

interface GraphNode {
    id: string;
    title: string;
    linkCount: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    pinned?: boolean;
}

interface GraphEdge {
    source: string;
    target: string;
    label?: string;
}

interface GraphViewProps {
    nodes: { id: string; title: string; linkCount: number }[];
    edges: GraphEdge[];
    onNodeClick?: (nodeId: string) => void;
}

function getNodeRadius(linkCount: number, total: number): number {
    const base = total > 60 ? 5 : total > 30 ? 7 : 8;
    return Math.max(base, Math.min(24, base + linkCount * 2.5));
}

export default function GraphView({ nodes: rawNodes, edges, onNodeClick }: GraphViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; linkCount: number } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const draggingCanvas = useRef(false);
    const draggingNode = useRef<GraphNode | null>(null);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const nodesRef = useRef<GraphNode[]>([]);
    const nodeMapRef = useRef(new Map<string, GraphNode>());
    const animRef = useRef<number>(0);
    const tickRef = useRef(0);
    const alphaRef = useRef(1);
    const colorsRef = useRef({ fg: '#adbac7', fgMuted: '#768390', accent: '#539bf5', accentGlow: 'rgba(83,155,245,0.3)', bg: '#1c2128', border: '#444c56', nodeBg: '#2d333b', edgeColor: 'rgba(68,76,86,0.4)' });

    const getThemeColors = useCallback(() => {
        if (typeof window === 'undefined') return;
        const cs = getComputedStyle(document.documentElement);
        const accent = cs.getPropertyValue('--accent-primary').trim() || '#539bf5';
        colorsRef.current = {
            fg: cs.getPropertyValue('--fg-primary').trim() || '#adbac7',
            fgMuted: cs.getPropertyValue('--fg-muted').trim() || '#768390',
            accent,
            accentGlow: accent + '40',
            bg: cs.getPropertyValue('--bg-primary').trim() || '#1c2128',
            border: cs.getPropertyValue('--border-subtle').trim() || '#444c56',
            nodeBg: cs.getPropertyValue('--bg-tertiary').trim() || '#2d333b',
            edgeColor: (cs.getPropertyValue('--border-subtle').trim() || '#444c56') + '66',
        };
    }, []);

    // Initialize nodes
    useEffect(() => {
        if (rawNodes.length === 0) return;
        const container = containerRef.current;
        const w = container?.clientWidth || 800;
        const h = container?.clientHeight || 600;
        const cx = w / 2, cy = h / 2;

        const map = new Map<string, GraphNode>();
        const simNodes: GraphNode[] = rawNodes.map((n, i) => {
            const angle = (2 * Math.PI * i) / rawNodes.length;
            const spread = Math.min(w, h) * 0.35;
            const jitter = () => (Math.random() - 0.5) * 40;
            const node: GraphNode = {
                ...n,
                x: cx + spread * Math.cos(angle) + jitter(),
                y: cy + spread * Math.sin(angle) + jitter(),
                vx: 0, vy: 0,
                radius: getNodeRadius(n.linkCount, rawNodes.length),
            };
            map.set(n.id, node);
            return node;
        });

        nodesRef.current = simNodes;
        nodeMapRef.current = map;
        alphaRef.current = 1;
        tickRef.current = 0;
    }, [rawNodes]);

    // Draw + simulate loop
    useEffect(() => {
        getThemeColors();
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || rawNodes.length === 0) return;

        const edgeMap = new Map<string, Set<string>>();
        for (const e of edges) {
            if (!edgeMap.has(e.source)) edgeMap.set(e.source, new Set());
            if (!edgeMap.has(e.target)) edgeMap.set(e.target, new Set());
            edgeMap.get(e.source)!.add(e.target);
            edgeMap.get(e.target)!.add(e.source);
        }

        let running = true;

        const tick = () => {
            if (!running) return;
            const nodes = nodesRef.current;
            const map = nodeMapRef.current;
            const w = container.clientWidth || 800;
            const h = container.clientHeight || 600;
            const cx = w / 2, cy = h / 2;

            const alpha = alphaRef.current;

            if (alpha > 0.001) {
                // Repulsion (Barnes-Hut approximation for large graphs: skip far pairs)
                const repulStr = nodes.length > 80 ? 600 : 1200;
                for (let i = 0; i < nodes.length; i++) {
                    const a = nodes[i];
                    if (a.pinned) continue;
                    for (let j = i + 1; j < nodes.length; j++) {
                        const b = nodes[j];
                        let dx = b.x - a.x || 0.1;
                        let dy = b.y - a.y || 0.1;
                        const distSq = dx * dx + dy * dy;
                        if (distSq > 250000) continue; // Skip very far pairs
                        const dist = Math.sqrt(distSq);
                        const force = repulStr / (distSq + 1);
                        const fx = (dx / dist) * force * alpha;
                        const fy = (dy / dist) * force * alpha;
                        a.vx -= fx; a.vy -= fy;
                        if (!b.pinned) { b.vx += fx; b.vy += fy; }
                    }
                }

                // Edge attraction
                const idealDist = nodes.length > 60 ? 100 : 140;
                for (const edge of edges) {
                    const a = map.get(edge.source);
                    const b = map.get(edge.target);
                    if (!a || !b) continue;
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = (dist - idealDist) * 0.008 * alpha;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    if (!a.pinned) { a.vx += fx; a.vy += fy; }
                    if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
                }

                // Center gravity
                for (const n of nodes) {
                    if (n.pinned) continue;
                    n.vx += (cx - n.x) * 0.0008 * alpha;
                    n.vy += (cy - n.y) * 0.0008 * alpha;
                }

                // Apply velocity
                for (const n of nodes) {
                    if (n.pinned) continue;
                    n.vx *= 0.88;
                    n.vy *= 0.88;
                    n.x += n.vx;
                    n.y += n.vy;
                    n.x = Math.max(n.radius + 5, Math.min(w - n.radius - 5, n.x));
                    n.y = Math.max(n.radius + 5, Math.min(h - n.radius - 5, n.y));
                }

                alphaRef.current *= 0.995;
            }

            // Draw
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
            }
            const ctx = canvas.getContext('2d')!;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const c = colorsRef.current;
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.save();
            ctx.translate(pan.x, pan.y);
            ctx.scale(zoom, zoom);

            const time = tickRef.current * 0.02;
            tickRef.current++;

            // Edges with animated pulse
            for (const edge of edges) {
                const a = map.get(edge.source);
                const b = map.get(edge.target);
                if (!a || !b) continue;

                const isHovered = hoveredNode === a.id || hoveredNode === b.id;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = isHovered ? c.accent : c.edgeColor;
                ctx.lineWidth = isHovered ? 2 : 1;
                ctx.globalAlpha = isHovered ? 0.8 : 0.35 + 0.1 * Math.sin(time + a.x * 0.01);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Nodes
            for (const node of nodes) {
                const isHovered = hoveredNode === node.id;
                const r = node.radius;
                const connected = node.linkCount > 0;

                // Glow for hovered or highly-connected nodes
                if (isHovered || node.linkCount > 4) {
                    const glowR = r + (isHovered ? 12 : 6);
                    const grad = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, glowR);
                    grad.addColorStop(0, isHovered ? c.accent + '50' : c.accent + '20');
                    grad.addColorStop(1, 'transparent');
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }

                // Subtle breathing animation on connected nodes
                const breathe = connected ? 1 + 0.03 * Math.sin(time * 0.8 + node.x * 0.05) : 1;
                const drawR = r * breathe;

                // Node fill
                ctx.beginPath();
                ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2);
                if (connected) {
                    const grad = ctx.createRadialGradient(node.x - drawR * 0.3, node.y - drawR * 0.3, 0, node.x, node.y, drawR);
                    grad.addColorStop(0, isHovered ? '#7cc4fa' : c.accent);
                    grad.addColorStop(1, isHovered ? c.accent : '#2a6cb8');
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = isHovered ? c.border : c.nodeBg;
                }
                ctx.fill();

                // Border
                ctx.strokeStyle = isHovered ? c.accent : c.border;
                ctx.lineWidth = isHovered ? 2 : 1;
                ctx.stroke();

                // Label
                const fontSize = Math.max(9, Math.min(12, 10 + node.linkCount * 0.3));
                ctx.font = `${isHovered ? '600' : '400'} ${fontSize}px system-ui, -apple-system, sans-serif`;
                ctx.fillStyle = isHovered ? c.fg : c.fgMuted;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const maxLabelLen = zoom < 0.6 ? 12 : zoom < 1 ? 16 : 22;
                const label = node.title.length > maxLabelLen ? node.title.slice(0, maxLabelLen - 2) + '...' : node.title;
                ctx.fillText(label, node.x, node.y + drawR + 5);
            }

            ctx.restore();

            animRef.current = requestAnimationFrame(tick);
        };

        animRef.current = requestAnimationFrame(tick);
        return () => { running = false; cancelAnimationFrame(animRef.current); };
    }, [rawNodes, edges, zoom, pan, hoveredNode, getThemeColors]);

    // Resize handler
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(() => getThemeColors());
        ro.observe(container);
        return () => ro.disconnect();
    }, [getThemeColors]);

    const screenToWorld = useCallback((clientX: number, clientY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (clientX - rect.left - pan.x) / zoom,
            y: (clientY - rect.top - pan.y) / zoom,
        };
    }, [pan, zoom]);

    const hitTest = useCallback((wx: number, wy: number): GraphNode | null => {
        for (let i = nodesRef.current.length - 1; i >= 0; i--) {
            const n = nodesRef.current[i];
            const dx = wx - n.x, dy = wy - n.y;
            if (dx * dx + dy * dy < (n.radius + 5) * (n.radius + 5)) return n;
        }
        return null;
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        const node = hitTest(x, y);
        if (node) {
            draggingNode.current = node;
            node.pinned = true;
            alphaRef.current = Math.max(alphaRef.current, 0.3); // reheat
        } else {
            draggingCanvas.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        }
    }, [pan, screenToWorld, hitTest]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (draggingNode.current) {
            const { x, y } = screenToWorld(e.clientX, e.clientY);
            draggingNode.current.x = x;
            draggingNode.current.y = y;
            draggingNode.current.vx = 0;
            draggingNode.current.vy = 0;
            alphaRef.current = Math.max(alphaRef.current, 0.1);
            setTooltip(null);
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (draggingCanvas.current) {
            setPan({
                x: dragStart.current.panX + (e.clientX - dragStart.current.x),
                y: dragStart.current.panY + (e.clientY - dragStart.current.y),
            });
            setTooltip(null);
            canvas.style.cursor = 'grabbing';
            return;
        }

        const { x, y } = screenToWorld(e.clientX, e.clientY);
        const node = hitTest(x, y);
        if (node) {
            const rect = canvas.getBoundingClientRect();
            setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10, title: node.title, linkCount: node.linkCount });
            setHoveredNode(node.id);
            canvas.style.cursor = 'pointer';
        } else {
            setTooltip(null);
            setHoveredNode(null);
            canvas.style.cursor = 'grab';
        }
    }, [screenToWorld, hitTest]);

    const handleMouseUp = useCallback(() => {
        if (draggingNode.current) {
            draggingNode.current.pinned = false;
            draggingNode.current = null;
        }
        draggingCanvas.current = false;
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (!onNodeClick) return;
        // Don't trigger click after drag
        if (draggingCanvas.current) return;
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        const node = hitTest(x, y);
        if (node) onNodeClick(node.id);
    }, [onNodeClick, screenToWorld, hitTest]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.15, Math.min(4, zoom * scaleFactor));
        // Zoom toward cursor
        setPan(p => ({
            x: mx - (mx - p.x) * (newZoom / zoom),
            y: my - (my - p.y) * (newZoom / zoom),
        }));
        setZoom(newZoom);
    }, [zoom]);

    const fitToScreen = useCallback(() => {
        const nodes = nodesRef.current;
        if (nodes.length === 0) return;
        const container = containerRef.current;
        if (!container) return;
        const w = container.clientWidth, h = container.clientHeight;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.x - n.radius);
            maxX = Math.max(maxX, n.x + n.radius);
            minY = Math.min(minY, n.y - n.radius);
            maxY = Math.max(maxY, n.y + n.radius);
        }
        const gw = maxX - minX + 80, gh = maxY - minY + 80;
        const newZoom = Math.min(w / gw, h / gh, 2);
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        setZoom(newZoom);
        setPan({ x: w / 2 - cx * newZoom, y: h / 2 - cy * newZoom });
    }, []);

    if (rawNodes.length === 0) {
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
                onMouseLeave={() => { handleMouseUp(); setTooltip(null); setHoveredNode(null); }}
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
                <button className={styles.controlBtn} onClick={() => setZoom(z => Math.min(4, z * 1.2))} title="Zoom in">
                    <ZoomIn size={14} />
                </button>
                <button className={styles.controlBtn} onClick={() => setZoom(z => Math.max(0.15, z / 1.2))} title="Zoom out">
                    <ZoomOut size={14} />
                </button>
                <button className={styles.controlBtn} onClick={fitToScreen} title="Fit to screen">
                    <Maximize2 size={14} />
                </button>
                <button className={styles.controlBtn} onClick={() => { alphaRef.current = 1; }} title="Re-layout">
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
}

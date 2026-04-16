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
    const base = total > 80 ? 4 : total > 40 ? 6 : 8;
    return Math.max(base, Math.min(22, base + linkCount * 2));
}

export default function GraphView({ nodes: rawNodes, edges, onNodeClick }: GraphViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const panRef = useRef({ x: 0, y: 0 });
    const [panState, setPanState] = useState({ x: 0, y: 0 });
    const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; linkCount: number } | null>(null);
    const hoveredRef = useRef<string | null>(null);

    const draggingCanvas = useRef(false);
    const draggingNode = useRef<GraphNode | null>(null);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const nodesRef = useRef<GraphNode[]>([]);
    const nodeMapRef = useRef(new Map<string, GraphNode>());
    const animRef = useRef<number>(0);
    const tickRef = useRef(0);
    const alphaRef = useRef(1);
    const didAutoFit = useRef(false);
    const zoomRef = useRef(1);
    const colorsRef = useRef({ fg: '#adbac7', fgMuted: '#768390', accent: '#539bf5', bg: '#1c2128', border: '#444c56', nodeBg: '#2d333b' });

    // Keep refs in sync with state
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panRef.current = panState; }, [panState]);

    const getThemeColors = useCallback(() => {
        if (typeof window === 'undefined') return;
        const cs = getComputedStyle(document.documentElement);
        const accent = cs.getPropertyValue('--accent-primary').trim() || '#539bf5';
        colorsRef.current = {
            fg: cs.getPropertyValue('--fg-primary').trim() || '#adbac7',
            fgMuted: cs.getPropertyValue('--fg-muted').trim() || '#768390',
            accent,
            bg: cs.getPropertyValue('--bg-primary').trim() || '#1c2128',
            border: cs.getPropertyValue('--border-subtle').trim() || '#444c56',
            nodeBg: cs.getPropertyValue('--bg-tertiary').trim() || '#2d333b',
        };
    }, []);

    const fitToScreen = useCallback(() => {
        const nodes = nodesRef.current;
        if (nodes.length === 0) return;
        const container = containerRef.current;
        if (!container) return;
        const w = container.clientWidth, h = container.clientHeight;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.x - n.radius - 60);
            maxX = Math.max(maxX, n.x + n.radius + 60);
            minY = Math.min(minY, n.y - n.radius - 30);
            maxY = Math.max(maxY, n.y + n.radius + 30);
        }
        const gw = maxX - minX || 1, gh = maxY - minY || 1;
        const newZoom = Math.min(w / gw, h / gh, 1.5) * 0.9;
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        setZoom(newZoom);
        const newPan = { x: w / 2 - cx * newZoom, y: h / 2 - cy * newZoom };
        setPanState(newPan);
        panRef.current = newPan;
        zoomRef.current = newZoom;
    }, []);

    // Initialize nodes — spread in a large circle, no clamping
    useEffect(() => {
        if (rawNodes.length === 0) return;
        const n = rawNodes.length;
        // Use a spiral layout for initial positions — much better than a circle for many nodes
        const map = new Map<string, GraphNode>();
        const simNodes: GraphNode[] = rawNodes.map((nd, i) => {
            const angle = i * 2.399963; // golden angle in radians
            const r = 18 * Math.sqrt(i + 1);
            const node: GraphNode = {
                ...nd,
                x: r * Math.cos(angle),
                y: r * Math.sin(angle),
                vx: 0, vy: 0,
                radius: getNodeRadius(nd.linkCount, n),
            };
            map.set(nd.id, node);
            return node;
        });

        nodesRef.current = simNodes;
        nodeMapRef.current = map;
        alphaRef.current = 1;
        tickRef.current = 0;
        didAutoFit.current = false;
    }, [rawNodes]);

    // Main simulation + render loop
    useEffect(() => {
        getThemeColors();
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || rawNodes.length === 0) return;

        // Build adjacency for connected-component awareness
        const neighbors = new Map<string, Set<string>>();
        for (const e of edges) {
            if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
            if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
            neighbors.get(e.source)!.add(e.target);
            neighbors.get(e.target)!.add(e.source);
        }

        let running = true;

        const tick = () => {
            if (!running) return;
            const nodes = nodesRef.current;
            const map = nodeMapRef.current;
            const alpha = alphaRef.current;
            const z = zoomRef.current;
            const p = panRef.current;

            if (alpha > 0.001) {
                const n = nodes.length;
                // Adaptive repulsion: stronger for more nodes
                const repulStr = n > 100 ? 3000 : n > 50 ? 2500 : 2000;
                const maxRepulDist = n > 100 ? 800 : 600;

                // Repulsion between all nodes — NO boundary clamping
                for (let i = 0; i < n; i++) {
                    const a = nodes[i];
                    if (a.pinned) continue;
                    for (let j = i + 1; j < n; j++) {
                        const b = nodes[j];
                        const dx = (b.x - a.x) || (Math.random() - 0.5);
                        const dy = (b.y - a.y) || (Math.random() - 0.5);
                        const distSq = dx * dx + dy * dy;
                        if (distSq > maxRepulDist * maxRepulDist) continue;
                        const dist = Math.sqrt(distSq);
                        const force = repulStr / (distSq + 10) * alpha;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        a.vx -= fx; a.vy -= fy;
                        if (!b.pinned) { b.vx += fx; b.vy += fy; }
                    }
                }

                // Edge attraction — pull connected nodes closer
                const idealDist = n > 80 ? 80 : n > 40 ? 100 : 120;
                for (const edge of edges) {
                    const a = map.get(edge.source);
                    const b = map.get(edge.target);
                    if (!a || !b) continue;
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = (dist - idealDist) * 0.01 * alpha;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    if (!a.pinned) { a.vx += fx; a.vy += fy; }
                    if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
                }

                // Very gentle center gravity — keeps the graph from drifting forever
                for (const nd of nodes) {
                    if (nd.pinned) continue;
                    nd.vx -= nd.x * 0.0003 * alpha;
                    nd.vy -= nd.y * 0.0003 * alpha;
                }

                // Apply velocity with damping — no boundary clamping
                for (const nd of nodes) {
                    if (nd.pinned) continue;
                    nd.vx *= 0.85;
                    nd.vy *= 0.85;
                    nd.x += nd.vx;
                    nd.y += nd.vy;
                }

                alphaRef.current *= 0.994;

                // Auto-fit once simulation is mostly settled
                if (!didAutoFit.current && alpha < 0.15) {
                    didAutoFit.current = true;
                    // Use setTimeout to avoid calling setState inside the animation frame
                    setTimeout(() => fitToScreen(), 0);
                }
            }

            // ─── DRAW ───
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            const cw = rect.width * dpr, ch = rect.height * dpr;
            if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw; canvas.height = ch;
            }
            const ctx = canvas.getContext('2d')!;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const c = colorsRef.current;
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.scale(z, z);

            const time = tickRef.current * 0.015;
            tickRef.current++;
            const hovered = hoveredRef.current;

            // Edges
            for (const edge of edges) {
                const a = map.get(edge.source);
                const b = map.get(edge.target);
                if (!a || !b) continue;
                const isHot = hovered === a.id || hovered === b.id;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                if (isHot) {
                    ctx.strokeStyle = c.accent;
                    ctx.lineWidth = 2 / z;
                    ctx.globalAlpha = 0.7;
                } else {
                    ctx.strokeStyle = c.border;
                    ctx.lineWidth = 1 / z;
                    ctx.globalAlpha = 0.2 + 0.05 * Math.sin(time + a.x * 0.005);
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Determine which labels to show based on zoom and density
            const showAllLabels = z > 0.5;
            const showSomeLabels = z > 0.25;

            // Nodes
            for (const nd of nodes) {
                const isHovered = hovered === nd.id;
                const connected = nd.linkCount > 0;
                const r = nd.radius;

                // Glow
                if (isHovered || nd.linkCount > 5) {
                    const glowR = r + (isHovered ? 14 : 8);
                    const grad = ctx.createRadialGradient(nd.x, nd.y, r * 0.4, nd.x, nd.y, glowR);
                    grad.addColorStop(0, c.accent + (isHovered ? '55' : '22'));
                    grad.addColorStop(1, 'transparent');
                    ctx.beginPath();
                    ctx.arc(nd.x, nd.y, glowR, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }

                // Breathing
                const breathe = connected ? 1 + 0.025 * Math.sin(time * 0.6 + nd.y * 0.03) : 1;
                const dr = r * breathe;

                // Fill
                ctx.beginPath();
                ctx.arc(nd.x, nd.y, dr, 0, Math.PI * 2);
                if (connected) {
                    const grad = ctx.createRadialGradient(nd.x - dr * 0.25, nd.y - dr * 0.25, 0, nd.x, nd.y, dr);
                    grad.addColorStop(0, isHovered ? '#8ad0ff' : c.accent);
                    grad.addColorStop(1, isHovered ? c.accent : '#1a5090');
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = isHovered ? c.border : c.nodeBg;
                }
                ctx.fill();
                ctx.strokeStyle = isHovered ? c.accent : c.border;
                ctx.lineWidth = (isHovered ? 2 : 0.8) / z;
                ctx.stroke();

                // Label
                const shouldShowLabel = isHovered || (showAllLabels) || (showSomeLabels && nd.linkCount > 2);
                if (shouldShowLabel) {
                    const fontSize = Math.max(8, Math.min(12, 9 + nd.linkCount * 0.3)) / Math.max(z, 0.4);
                    ctx.font = `${isHovered ? '600' : '400'} ${fontSize}px system-ui, -apple-system, sans-serif`;
                    ctx.fillStyle = isHovered ? c.fg : c.fgMuted;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const maxLen = z > 0.8 ? 24 : z > 0.5 ? 16 : 10;
                    const label = nd.title.length > maxLen ? nd.title.slice(0, maxLen - 1) + '\u2026' : nd.title;
                    ctx.fillText(label, nd.x, nd.y + dr + 4 / z);
                }
            }

            ctx.restore();
            animRef.current = requestAnimationFrame(tick);
        };

        animRef.current = requestAnimationFrame(tick);
        return () => { running = false; cancelAnimationFrame(animRef.current); };
    }, [rawNodes, edges, getThemeColors, fitToScreen]);

    // Resize
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
            x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
            y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
        };
    }, []);

    const hitTest = useCallback((wx: number, wy: number): GraphNode | null => {
        const nodes = nodesRef.current;
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const dx = wx - n.x, dy = wy - n.y;
            if (dx * dx + dy * dy < (n.radius + 6) * (n.radius + 6)) return n;
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
            alphaRef.current = Math.max(alphaRef.current, 0.3);
        } else {
            draggingCanvas.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
        }
    }, [screenToWorld, hitTest]);

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
            const newPan = {
                x: dragStart.current.panX + (e.clientX - dragStart.current.x),
                y: dragStart.current.panY + (e.clientY - dragStart.current.y),
            };
            setPanState(newPan);
            panRef.current = newPan;
            setTooltip(null);
            canvas.style.cursor = 'grabbing';
            return;
        }

        const { x, y } = screenToWorld(e.clientX, e.clientY);
        const node = hitTest(x, y);
        if (node) {
            const rect = canvas.getBoundingClientRect();
            setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10, title: node.title, linkCount: node.linkCount });
            hoveredRef.current = node.id;
            canvas.style.cursor = 'pointer';
        } else {
            setTooltip(null);
            hoveredRef.current = null;
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
        if (!onNodeClick || draggingCanvas.current) return;
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
        const z = zoomRef.current;
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.08, Math.min(5, z * scaleFactor));
        const newPan = {
            x: mx - (mx - panRef.current.x) * (newZoom / z),
            y: my - (my - panRef.current.y) * (newZoom / z),
        };
        setZoom(newZoom);
        setPanState(newPan);
        panRef.current = newPan;
        zoomRef.current = newZoom;
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
                onMouseLeave={() => { handleMouseUp(); setTooltip(null); hoveredRef.current = null; }}
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
                <button className={styles.controlBtn} onClick={() => { setZoom(z => { const nz = Math.min(5, z * 1.3); zoomRef.current = nz; return nz; }); }} title="Zoom in">
                    <ZoomIn size={14} />
                </button>
                <button className={styles.controlBtn} onClick={() => { setZoom(z => { const nz = Math.max(0.08, z / 1.3); zoomRef.current = nz; return nz; }); }} title="Zoom out">
                    <ZoomOut size={14} />
                </button>
                <button className={styles.controlBtn} onClick={fitToScreen} title="Fit to screen">
                    <Maximize2 size={14} />
                </button>
                <button className={styles.controlBtn} onClick={() => { alphaRef.current = 1; didAutoFit.current = false; }} title="Re-layout">
                    <RotateCcw size={14} />
                </button>
            </div>
        </div>
    );
}

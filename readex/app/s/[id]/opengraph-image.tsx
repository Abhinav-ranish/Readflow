import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

export const alt = 'Readflow Document';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Extract structured metadata lines (e.g. **Key:** Value) from the top of the doc
function extractMetadata(markdown: string): { title: string; meta: string[]; body: string } {
    const lines = markdown.split('\n');
    let title = '';
    const meta: string[] = [];
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === '---') {
            // Skip blank lines and horizontal rules at the top
            bodyStart = i + 1;
            continue;
        }

        // Heading line — use as title if we don't have one
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        if (headingMatch && !title) {
            title = headingMatch[1].replace(/[*_~`]/g, '');
            bodyStart = i + 1;
            continue;
        }

        // Metadata line: **Key:** Value or **Key**: Value
        const metaMatch = line.match(/^\*\*([^*]+?):\*\*\s*(.+)/);
        if (metaMatch) {
            meta.push(`${metaMatch[1].trim()}: ${metaMatch[2].replace(/[*_~`]/g, '').trim()}`);
            bodyStart = i + 1;
            continue;
        }

        // If we hit a non-meta, non-heading, non-blank line, stop scanning
        if (meta.length > 0 || title) {
            bodyStart = i;
            break;
        }

        // First real content line — stop
        bodyStart = i;
        break;
    }

    // Extract a clean body snippet from remaining content
    const body = lines
        .slice(bodyStart)
        .join('\n')
        .replace(/```[\s\S]*?```/g, '')         // code blocks
        .replace(/^#{1,6}\s+/gm, '')            // headings
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links/images
        .replace(/[*_~`>]/g, '')                 // formatting
        .replace(/\n{2,}/g, '\n')               // collapse blank lines
        .trim()
        .split('\n')[0]                          // first meaningful paragraph line
        ?.trim()
        .slice(0, 200) || '';

    return { title, meta, body };
}

export default async function OGImage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const entry = await db.getReadme(id);

    const parsed = entry ? extractMetadata(entry.content) : null;
    const title = entry?.title || parsed?.title || 'Shared Document';
    const metaLines = parsed?.meta || [];
    const bodyPreview = parsed?.body || '';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(145deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
                    padding: '60px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative gradient orbs */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-120px',
                        right: '-80px',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(88,166,255,0.08) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-100px',
                        left: '-60px',
                        width: '300px',
                        height: '300px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(136,98,234,0.06) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />

                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '32px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                            style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #58a6ff 0%, #8862ea 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28px',
                                fontWeight: 800,
                                color: '#ffffff',
                                boxShadow: '0 4px 12px rgba(88,166,255,0.3)',
                            }}
                        >
                            R
                        </div>
                        <span
                            style={{
                                fontSize: '26px',
                                color: '#c9d1d9',
                                fontWeight: 600,
                                letterSpacing: '-0.5px',
                            }}
                        >
                            Readflow
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(136,98,234,0.12)',
                            border: '1px solid rgba(136,98,234,0.25)',
                            borderRadius: '50px',
                            padding: '6px 14px',
                            fontSize: '15px',
                            color: '#b88aff',
                        }}
                    >
                        AI Agent Ready
                    </div>
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: '48px',
                        fontWeight: 700,
                        color: '#f0f6fc',
                        lineHeight: 1.15,
                        marginBottom: '24px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        letterSpacing: '-1px',
                    }}
                >
                    {title}
                </div>

                {/* Metadata fields — each on its own line */}
                {metaLines.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            marginBottom: '16px',
                        }}
                    >
                        {metaLines.slice(0, 5).map((line) => {
                            const colonIdx = line.indexOf(':');
                            const label = line.slice(0, colonIdx + 1);
                            const value = line.slice(colonIdx + 1).trim();
                            return (
                                <div
                                    key={line}
                                    style={{
                                        display: 'flex',
                                        fontSize: '20px',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    <span style={{ color: '#58a6ff', fontWeight: 600, marginRight: '6px' }}>
                                        {label}
                                    </span>
                                    <span style={{ color: '#8b949e' }}>
                                        {value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Body preview — only if there's space */}
                {bodyPreview && metaLines.length < 4 && (
                    <div
                        style={{
                            flex: 1,
                            fontSize: '20px',
                            color: '#6e7681',
                            lineHeight: 1.5,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {bodyPreview}
                    </div>
                )}

                {/* Footer bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(48,54,61,0.8)',
                        paddingTop: '24px',
                        marginTop: 'auto',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '18px', color: '#484f58' }}>
                            readflow.aranish.uk
                        </span>
                        <span style={{ fontSize: '14px', color: '#30363d' }}>|</span>
                        <span style={{ fontSize: '16px', color: '#484f58' }}>
                            Markdown + PDF + API
                        </span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(56,139,253,0.1)',
                            border: '1px solid rgba(88,166,255,0.2)',
                            borderRadius: '50px',
                            padding: '6px 16px',
                            fontSize: '16px',
                            color: '#58a6ff',
                        }}
                    >
                        Read Only
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}

import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

export const alt = 'Readflow Document';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function extractPreview(markdown: string): string {
    return markdown
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~`>]/g, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\n{2,}/g, '\n')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 280);
}

export default async function OGImage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const entry = await db.getReadme(id);

    const title = entry?.title || 'Shared Document';
    const preview = entry ? extractPreview(entry.content) : '';

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
                        marginBottom: '40px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Stylized icon */}
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

                    {/* AI badge */}
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
                        fontSize: '52px',
                        fontWeight: 700,
                        color: '#f0f6fc',
                        lineHeight: 1.15,
                        marginBottom: '20px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        letterSpacing: '-1px',
                    }}
                >
                    {title}
                </div>

                {/* Content preview */}
                <div
                    style={{
                        flex: 1,
                        fontSize: '22px',
                        color: '#8b949e',
                        lineHeight: 1.55,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {preview || 'A shared markdown document on Readflow.'}
                </div>

                {/* Footer bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(48,54,61,0.8)',
                        paddingTop: '24px',
                        marginTop: '16px',
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
                            gap: '8px',
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

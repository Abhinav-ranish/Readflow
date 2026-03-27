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
                    background: '#0d1117',
                    padding: '60px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '40px',
                    }}
                >
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '10px',
                            background: '#c9d1d9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#0d1117',
                        }}
                    >
                        R
                    </div>
                    <span
                        style={{
                            fontSize: '28px',
                            color: '#8b949e',
                            fontWeight: 400,
                        }}
                    >
                        Readflow
                    </span>
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: '52px',
                        fontWeight: 700,
                        color: '#c9d1d9',
                        lineHeight: 1.2,
                        marginBottom: '24px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}
                >
                    {title}
                </div>

                {/* Content preview */}
                <div
                    style={{
                        flex: 1,
                        fontSize: '24px',
                        color: '#8b949e',
                        lineHeight: 1.5,
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
                        borderTop: '1px solid #30363d',
                        paddingTop: '24px',
                        marginTop: '20px',
                    }}
                >
                    <span style={{ fontSize: '20px', color: '#484f58' }}>
                        readflow.vercel.app
                    </span>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(56, 139, 253, 0.1)',
                            border: '1px solid rgba(88, 166, 255, 0.2)',
                            borderRadius: '50px',
                            padding: '6px 16px',
                            fontSize: '18px',
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

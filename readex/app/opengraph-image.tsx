import { ImageResponse } from 'next/og';

export const alt = 'Readflow — Write, Preview & Share Markdown';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(145deg, #0d1117 0%, #161b22 40%, #0d1117 100%)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative orbs */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-200px',
                        right: '-100px',
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(88,166,255,0.07) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-200px',
                        left: '-100px',
                        width: '500px',
                        height: '500px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(136,98,234,0.06) 0%, transparent 70%)',
                        display: 'flex',
                    }}
                />

                {/* Icon */}
                <div
                    style={{
                        width: '88px',
                        height: '88px',
                        borderRadius: '22px',
                        background: 'linear-gradient(135deg, #58a6ff 0%, #8862ea 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        fontWeight: 800,
                        color: '#ffffff',
                        boxShadow: '0 8px 32px rgba(88,166,255,0.3)',
                        marginBottom: '32px',
                    }}
                >
                    R
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: '56px',
                        fontWeight: 700,
                        color: '#f0f6fc',
                        letterSpacing: '-1.5px',
                        marginBottom: '16px',
                    }}
                >
                    Readflow
                </div>

                {/* Subtitle */}
                <div
                    style={{
                        fontSize: '26px',
                        color: '#8b949e',
                        lineHeight: 1.5,
                        textAlign: 'center',
                        maxWidth: '700px',
                        marginBottom: '40px',
                    }}
                >
                    Write, preview & share markdown. Download as PDF.
                    Supports AI agents via API.
                </div>

                {/* Feature pills */}
                <div
                    style={{
                        display: 'flex',
                        gap: '12px',
                    }}
                >
                    {[
                        { label: 'Live Preview', color: '88,166,255' },
                        { label: 'PDF Export', color: '88,166,255' },
                        { label: 'Share Links', color: '88,166,255' },
                        { label: 'AI Agent API', color: '136,98,234' },
                    ].map((pill) => (
                        <div
                            key={pill.label}
                            style={{
                                display: 'flex',
                                background: `rgba(${pill.color},0.1)`,
                                border: `1px solid rgba(${pill.color},0.2)`,
                                borderRadius: '50px',
                                padding: '8px 20px',
                                fontSize: '18px',
                                color: `rgb(${pill.color})`,
                            }}
                        >
                            {pill.label}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '32px',
                        display: 'flex',
                        fontSize: '18px',
                        color: '#484f58',
                    }}
                >
                    readflow.aranish.uk
                </div>
            </div>
        ),
        { ...size }
    );
}

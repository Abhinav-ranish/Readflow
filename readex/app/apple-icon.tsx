import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0d1117',
                    borderRadius: 38,
                    border: '6px solid #1f6feb',
                }}
            >
                <span
                    style={{
                        fontSize: 120,
                        fontWeight: 800,
                        color: '#c9d1d9',
                        fontFamily: 'Georgia, serif',
                        marginTop: -8,
                    }}
                >
                    R
                </span>
            </div>
        ),
        { ...size }
    );
}

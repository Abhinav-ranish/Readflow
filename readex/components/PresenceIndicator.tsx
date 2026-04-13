'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './PresenceIndicator.module.css';

interface Viewer {
    userId: string;
    name: string;
    image?: string;
    lastSeen: number;
}

export default function PresenceIndicator({ docId }: { docId: string }) {
    const [viewers, setViewers] = useState<Viewer[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    useEffect(() => {
        const heartbeat = async () => {
            try {
                await fetch(`/api/presence/${docId}`, { method: 'POST' });
                const res = await fetch(`/api/presence/${docId}`);
                if (res.ok) {
                    const data = await res.json();
                    setViewers(data);
                }
            } catch { /* ignore */ }
        };

        heartbeat();
        intervalRef.current = setInterval(heartbeat, 30000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [docId]);

    if (viewers.length <= 1) return null; // Don't show if only current user

    return (
        <div className={styles.container} title={`${viewers.length} viewing`}>
            <div className={styles.avatars}>
                {viewers.slice(0, 5).map((v, i) => (
                    v.image ? (
                        <img key={v.userId} src={v.image} alt={v.name} className={styles.avatar} style={{ zIndex: 5 - i }} title={v.name} />
                    ) : (
                        <div key={v.userId} className={styles.avatarFallback} style={{ zIndex: 5 - i }} title={v.name}>
                            {(v.name || '?')[0].toUpperCase()}
                        </div>
                    )
                ))}
                {viewers.length > 5 && (
                    <div className={styles.avatarMore}>+{viewers.length - 5}</div>
                )}
            </div>
            <span className={styles.label}>{viewers.length} viewing</span>
        </div>
    );
}

'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, LayoutDashboard, User } from 'lucide-react';
import Link from 'next/link';
import styles from './UserMenu.module.css';

export default function UserMenu() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    if (!session?.user) {
        return (
            <Link href="/login" className={styles.signInBtn}>
                Sign in
            </Link>
        );
    }

    return (
        <div className={styles.wrapper} ref={ref}>
            <button className={styles.avatar} onClick={() => setOpen(!open)} aria-label="User menu">
                {session.user.image ? (
                    <img src={session.user.image} alt="" className={styles.avatarImg} />
                ) : (
                    <User size={16} />
                )}
            </button>
            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{session.user.name}</span>
                        <span className={styles.userEmail}>{session.user.email}</span>
                    </div>
                    <div className={styles.divider} />
                    <Link href="/dashboard" className={styles.menuItem} onClick={() => setOpen(false)}>
                        <LayoutDashboard size={15} />
                        My Documents
                    </Link>
                    <button className={styles.menuItem} onClick={() => signOut()}>
                        <LogOut size={15} />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}

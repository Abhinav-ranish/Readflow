import React from 'react';
import { db } from '@/lib/db';
import Preview from '@/components/Preview';
import DownloadButtons from '@/components/DownloadButtons';
import styles from './page.module.css';
import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function SharedReadmePage({ params }: Props) {
    const { id } = await params;

    const content = await db.getReadme(id);

    if (!content) {
        notFound();
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.branding}>
                    <Link href="/" className={styles.logoLink}>
                        <span className={styles.logoIcon}>R</span>
                        <span className={styles.logoText}>Readflow</span>
                    </Link>
                    <div className={styles.separator}>/</div>
                    <div className={styles.badge}>
                        <Lock size={14} />
                        <span>Read Only</span>
                    </div>
                </div>
                <div className={styles.actions}>
                    <DownloadButtons content={content} />
                    <Link href="/" className={styles.createLink}>
                        Create New
                    </Link>
                </div>
            </header>
            <main className={styles.main}>
                <div data-preview-content>
                    <Preview content={content} />
                </div>
            </main>
        </div>
    );
}

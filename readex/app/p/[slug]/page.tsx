import React from 'react';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const entry = await db.getReadmeBySlug(slug);
    if (!entry) return { title: 'Not Found — Readflow' };

    const pageTitle = entry.title ? `${entry.title} — Readflow` : 'Shared Document — Readflow';
    return { title: pageTitle };
}

export default async function CustomSlugPage({ params }: Props) {
    const { slug } = await params;
    const entry = await db.getReadmeBySlug(slug);

    if (!entry) {
        notFound();
    }

    // Redirect to the canonical /s/[id] page — the slug is just a vanity URL
    redirect(`/s/${entry.id}`);
}

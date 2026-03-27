'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import TopBar from '@/components/TopBar';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import MobileToggle from '@/components/MobileToggle';
import ShareModal from '@/components/ShareModal';
import clsx from 'clsx';

const DEFAULT_MARKDOWN = `# Welcome to Readflow

Start typing in the editor to the left to see your changes appear here instantly.

## Features
- **Markdown Support**: Headers, lists, code blocks, and more.
- **Live Preview**: See what you write in real-time.
- **Private Sharing**: Share a read-only link instantly.

\`\`\`javascript
console.log("Happy coding!");
\`\`\`
`;

export default function Home() {
  const [markdown, setMarkdown] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('readex_draft');
    setMarkdown(saved !== null ? saved : DEFAULT_MARKDOWN);
    const lastUrl = localStorage.getItem('readex_last_share_url');
    if (lastUrl) setShareUrl(lastUrl);
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('readex_draft', markdown);
    }
  }, [markdown, isLoaded]);

  const handleShare = async () => {
    setIsSharing(true);
    setShareError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to share');
      }

      const data = await res.json();
      setShareUrl(data.url);
      localStorage.setItem('readex_last_share_url', data.url);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to share';
      setShareError(message);
      setTimeout(() => setShareError(null), 4000);
    } finally {
      setIsSharing(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <TopBar
        onShare={handleShare}
        isSharing={isSharing}
        error={shareError}
        lastShareUrl={shareUrl}
        onShowLastLink={() => setIsModalOpen(true)}
      />

      <div className={styles.workspace}>
        {/* Editor Pane */}
        <div className={clsx(styles.pane, styles.editorPane, viewMode === 'preview' && styles.hiddenOnMobile)}>
          <Editor
            value={markdown}
            onChange={setMarkdown}
            className={styles.editor}
          />
        </div>

        {/* Preview Pane */}
        <div className={clsx(styles.pane, styles.previewPane, viewMode === 'editor' && styles.hiddenOnMobile)}>
          <Preview content={markdown} />
        </div>
      </div>

      <MobileToggle
        viewMode={viewMode}
        onToggle={() => setViewMode(v => v === 'editor' ? 'preview' : 'editor')}
      />

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        url={shareUrl}
      />
    </main>
  );
}

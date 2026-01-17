'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import TopBar from '@/components/TopBar';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import MobileToggle from '@/components/MobileToggle';
import clsx from 'clsx';

const DEFAULT_MARKDOWN = `# Welcome to Readex

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

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('readex_draft');
    setMarkdown(saved !== null ? saved : DEFAULT_MARKDOWN);
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
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdown }),
      });

      if (!res.ok) throw new Error('Failed to share');

      const data = await res.json();
      await navigator.clipboard.writeText(data.url);

      // Could use a toast here, but alert is fine for now as requested "Simple"
      alert('Link copied to clipboard! ' + data.url);
    } catch (error) {
      console.error(error);
      alert('Error sharing document.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>Loading...</div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <TopBar onShare={handleShare} isSharing={isSharing} />

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
    </main>
  );
}

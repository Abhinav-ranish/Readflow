'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import TopBar from '@/components/TopBar';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import MobileToggle from '@/components/MobileToggle';
import ShareModal from '@/components/ShareModal';
import TableOfContents from '@/components/TableOfContents';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import TemplateSelector from '@/components/TemplateSelector';
import LayoutToggle from '@/components/LayoutToggle';
import FirstRunGuide from '@/components/FirstRunGuide';
import type { DesktopLayout } from '@/components/LayoutToggle';
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
  const [lastShareUrl, setLastShareUrl] = useState<string>('');
  const [desktopLayout, setDesktopLayout] = useState<DesktopLayout>('split');

  const toggleView = React.useCallback(() => {
    setViewMode(v => v === 'editor' ? 'preview' : 'editor');
  }, []);

  const cycleLayout = React.useCallback(() => {
    setDesktopLayout(l => l === 'split' ? 'editor' : l === 'editor' ? 'preview' : 'split');
  }, []);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('readex_draft');
    setMarkdown(saved !== null ? saved : DEFAULT_MARKDOWN);
    const lastUrl = localStorage.getItem('readex_last_share_url');
    if (lastUrl) setLastShareUrl(lastUrl);
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('readex_draft', markdown);
    }
  }, [markdown, isLoaded]);

  const openShareModal = () => {
    // Reset shareUrl so the modal shows the title input (fresh share)
    setShareUrl('');
    setShareError(null);
    setIsModalOpen(true);
  };

  const handleShare = async (title: string, password?: string, expiresIn?: number) => {
    setIsSharing(true);
    setShareError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: markdown,
          title: title || undefined,
          password: password || undefined,
          expiresIn: expiresIn || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to share');
      }

      const data = await res.json();
      setShareUrl(data.url);
      setLastShareUrl(data.url);
      localStorage.setItem('readex_last_share_url', data.url);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to share';
      setShareError(message);
      setTimeout(() => setShareError(null), 4000);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShowLastLink = () => {
    setShareUrl(lastShareUrl);
    setIsModalOpen(true);
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
      <KeyboardShortcuts onShare={openShareModal} onToggleView={toggleView} onCycleLayout={cycleLayout} />

      <TopBar
        onShare={openShareModal}
        isSharing={isSharing}
        error={shareError}
        lastShareUrl={lastShareUrl}
        onShowLastLink={handleShowLastLink}
        templateSelector={<TemplateSelector onSelect={setMarkdown} />}
        layoutToggle={<LayoutToggle layout={desktopLayout} onChange={setDesktopLayout} />}
      />

      <div className={styles.workspace}>
        {/* Editor Pane */}
        <div className={clsx(
          styles.pane,
          styles.editorPane,
          viewMode === 'preview' && styles.hiddenOnMobile,
          desktopLayout === 'preview' && styles.hiddenOnDesktop,
        )}>
          <Editor
            value={markdown}
            onChange={setMarkdown}
            className={styles.editor}
          />
        </div>

        {/* Preview Pane */}
        <div className={clsx(
          styles.pane,
          styles.previewPane,
          viewMode === 'editor' && styles.hiddenOnMobile,
          desktopLayout === 'editor' && styles.hiddenOnDesktop,
        )}>
          <Preview content={markdown} />
        </div>
      </div>

      <TableOfContents content={markdown} />

      <MobileToggle
        viewMode={viewMode}
        onToggle={toggleView}
      />

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        url={shareUrl}
        onShare={handleShare}
        isSharing={isSharing}
      />

      {markdown === DEFAULT_MARKDOWN && <FirstRunGuide />}
    </main>
  );
}

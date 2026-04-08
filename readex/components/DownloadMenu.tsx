'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Check, FileText, Code2, FileDown, X } from 'lucide-react';
import styles from './DownloadMenu.module.css';

interface DownloadMenuProps {
    content: string;
    title?: string;
}

// GitHub-flavored light mode CSS for PDF rendering
const PDF_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background: #ffffff;
    color: #1f2328;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
}
h1, h2, h3, h4, h5, h6 {
    margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25;
    color: #1f2328; word-spacing: 0.1em; white-space: pre-wrap; page-break-after: avoid;
}
h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
h3 { font-size: 1.25em; }
p { margin-bottom: 16px; }
a { color: #0969da; text-decoration: none; }
strong, b { font-weight: 600; }
code {
    padding: 0.2em 0.4em; font-size: 85%; background-color: #eff1f3; border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
pre {
    padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #f6f8fa;
    border-radius: 6px; margin-bottom: 16px; border: 1px solid #d1d9e0;
    white-space: pre-wrap; word-break: break-word; page-break-inside: avoid;
}
pre code { background: none; padding: 0; font-size: 100%; white-space: pre-wrap; word-break: break-word; }
blockquote { padding: 0 1em; color: #656d76; border-left: 0.25em solid #d1d9e0; margin: 0 0 16px 0; }
ul, ol { padding-left: 2em; margin-bottom: 16px; }
li { margin-bottom: 4px; page-break-inside: avoid; }
table { border-spacing: 0; border-collapse: collapse; margin-bottom: 16px; width: 100%; }
table th, table td { padding: 6px 13px; border: 1px solid #d1d9e0; }
table th { font-weight: 600; background-color: #f6f8fa; }
table tr:nth-child(2n) { background-color: #f6f8fa; }
hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #d1d9e0; border: 0; }
img { max-width: 100%; }
`;

export default function DownloadMenu({ content, title }: DownloadMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const filename = title || 'document';

    const toggle = (format: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(format)) next.delete(format);
            else next.add(format);
            return next;
        });
    };

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    const downloadMd = useCallback(() => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [content, filename]);

    const downloadHtml = useCallback(() => {
        const previewEl = document.querySelector('[data-preview-content]');
        if (!previewEl) return;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #fff; color: #1f2328; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 16px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
h1,h2,h3,h4,h5,h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
h1 { font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid #d1d9e0; }
h2 { font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid #d1d9e0; }
a { color: #0969da; }
code { padding: .2em .4em; font-size: 85%; background: #eff1f3; border-radius: 6px; font-family: ui-monospace, monospace; }
pre { padding: 16px; overflow: auto; font-size: 85%; background: #f6f8fa; border-radius: 6px; margin-bottom: 16px; }
pre code { background: none; padding: 0; }
blockquote { padding: 0 1em; color: #656d76; border-left: .25em solid #d1d9e0; margin: 0 0 16px; }
ul,ol { padding-left: 2em; margin-bottom: 16px; }
table { border-spacing: 0; border-collapse: collapse; margin-bottom: 16px; width: 100%; }
th,td { padding: 6px 13px; border: 1px solid #d1d9e0; }
th { font-weight: 600; background: #f6f8fa; }
hr { height: .25em; margin: 24px 0; background: #d1d9e0; border: 0; }
img { max-width: 100%; }
</style>
</head>
<body>
${previewEl.innerHTML}
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [content, filename]);

    const downloadPdf = useCallback(async () => {
        const html2pdf = (await import('html2pdf.js')).default;
        const previewEl = document.querySelector('[data-preview-content]');
        if (!previewEl) return;

        const rawHtml = previewEl.innerHTML;
        const cleanHtml = rawHtml
            .replace(/\s*class="[^"]*"/g, '')
            .replace(/\s*style="[^"]*"/g, '')
            .replace(/\s*data-[a-z-]*="[^"]*"/g, '');

        const container = document.createElement('div');
        container.innerHTML = `
            <style>${PDF_STYLES}</style>
            <div style="background:#ffffff;color:#1f2328;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;">
                ${cleanHtml}
            </div>
        `;

        container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
            const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                if (node.textContent) {
                    node.textContent = node.textContent.replace(/ /g, '\u00A0');
                }
            }
        });

        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#ffffff;z-index:-1;';
        document.body.appendChild(container);

        const opt = {
            margin: [15, 15, 15, 15],
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            pagebreak: { mode: ['css'], avoid: ['h1','h2','h3','h4','h5','h6','pre','blockquote','li','tr'] },
        };

        const target = container.querySelector('div') as HTMLElement;
        await html2pdf().set(opt).from(target).save();
        document.body.removeChild(container);
    }, [content, filename]);

    const handleDownload = async () => {
        if (selected.size === 0) return;
        setDownloading(true);
        try {
            if (selected.has('md')) downloadMd();
            if (selected.has('html')) downloadHtml();
            if (selected.has('pdf')) await downloadPdf();
        } finally {
            setDownloading(false);
            setIsOpen(false);
            setSelected(new Set());
        }
    };

    const formats = [
        { key: 'md', label: 'Markdown (.md)', icon: <FileText size={15} /> },
        { key: 'html', label: 'HTML (.html)', icon: <Code2 size={15} /> },
        { key: 'pdf', label: 'PDF (.pdf)', icon: <FileDown size={15} /> },
    ];

    return (
        <div className={styles.wrapper} ref={menuRef}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Download size={16} />
                <span>Download</span>
            </button>

            {isOpen && (
                <div className={styles.dropdown} role="menu">
                    <div className={styles.header}>
                        <span className={styles.headerText}>Export formats</span>
                        <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="Close">
                            <X size={14} />
                        </button>
                    </div>
                    <div className={styles.options}>
                        {formats.map(f => (
                            <label key={f.key} className={styles.option}>
                                <div className={`${styles.checkbox} ${selected.has(f.key) ? styles.checked : ''}`}>
                                    {selected.has(f.key) && <Check size={12} />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selected.has(f.key)}
                                    onChange={() => toggle(f.key)}
                                    className={styles.hiddenInput}
                                />
                                {f.icon}
                                <span>{f.label}</span>
                            </label>
                        ))}
                    </div>
                    <button
                        className={styles.downloadBtn}
                        onClick={handleDownload}
                        disabled={selected.size === 0 || downloading}
                    >
                        {downloading ? 'Preparing...' : `Download${selected.size > 0 ? ` (${selected.size})` : ''}`}
                    </button>
                </div>
            )}
        </div>
    );
}

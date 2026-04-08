'use client';
import React from 'react';
import { Code2 } from 'lucide-react';
import styles from './ExportHtmlButton.module.css';

interface ExportHtmlButtonProps {
    content: string;
    title?: string;
}

export default function ExportHtmlButton({ content, title }: ExportHtmlButtonProps) {
    const handleExport = () => {
        const previewEl = document.querySelector('[data-preview-content]');
        if (!previewEl) return;

        const filename = title || 'document';
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #ffffff;
            color: #1f2328;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
        h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
        h3 { font-size: 1.25em; }
        a { color: #0969da; }
        code { padding: 0.2em 0.4em; font-size: 85%; background: #eff1f3; border-radius: 6px; font-family: ui-monospace, monospace; }
        pre { padding: 16px; overflow: auto; font-size: 85%; background: #f6f8fa; border-radius: 6px; margin-bottom: 16px; }
        pre code { background: none; padding: 0; }
        blockquote { padding: 0 1em; color: #656d76; border-left: 0.25em solid #d1d9e0; margin: 0 0 16px 0; }
        ul, ol { padding-left: 2em; margin-bottom: 16px; }
        table { border-spacing: 0; border-collapse: collapse; margin-bottom: 16px; width: 100%; }
        th, td { padding: 6px 13px; border: 1px solid #d1d9e0; }
        th { font-weight: 600; background: #f6f8fa; }
        hr { height: 0.25em; padding: 0; margin: 24px 0; background: #d1d9e0; border: 0; }
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
    };

    return (
        <button className={styles.exportButton} onClick={handleExport} title="Download as HTML">
            <Code2 size={16} />
            <span>HTML</span>
        </button>
    );
}

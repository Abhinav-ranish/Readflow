'use client';
import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import styles from './DownloadButtons.module.css';

interface DownloadButtonsProps {
    content: string;
}

export default function DownloadButtons({ content }: DownloadButtonsProps) {
    const [pdfLoading, setPdfLoading] = useState(false);

    const handleDownloadReadme = () => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'README.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = async () => {
        setPdfLoading(true);
        try {
            // Render the preview content to a printable window and use browser's PDF engine
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow popups to download PDF.');
                return;
            }

            // Get the rendered markdown HTML from the page
            const previewEl = document.querySelector('[data-preview-content]');
            const htmlContent = previewEl ? previewEl.innerHTML : '';

            // Get computed styles for the preview
            const stylesheets = Array.from(document.styleSheets);
            let cssText = '';
            for (const sheet of stylesheets) {
                try {
                    const rules = Array.from(sheet.cssRules);
                    cssText += rules.map(r => r.cssText).join('\n');
                } catch {
                    // Skip cross-origin stylesheets
                }
            }

            printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>README</title>
<style>
${cssText}
body {
    background: #0d1117;
    color: #c9d1d9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
}
@media print {
    body { background: white; color: #1f2328; }
    pre, code { background: #f6f8fa !important; color: #1f2328 !important; }
    a { color: #0969da; }
    table tr:nth-child(2n) { background: #f6f8fa; }
    table th, table td { border-color: #d0d7de; }
    h1, h2 { border-color: #d0d7de; }
    blockquote { color: #656d76; border-color: #d0d7de; }
}
</style>
</head>
<body>${htmlContent}</body>
</html>`);
            printWindow.document.close();

            // Give styles time to apply, then trigger print dialog (Save as PDF)
            setTimeout(() => {
                printWindow.print();
                // Close the window after print dialog
                printWindow.onafterprint = () => printWindow.close();
            }, 300);
        } catch (error) {
            console.error('PDF generation failed:', error);
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className={styles.downloadBar}>
            <button className={styles.downloadButton} onClick={handleDownloadReadme}>
                <FileText size={16} />
                <span>Download README.md</span>
            </button>
            <button
                className={styles.downloadButton}
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
            >
                <Download size={16} />
                <span>{pdfLoading ? 'Preparing...' : 'Download PDF'}</span>
            </button>
        </div>
    );
}

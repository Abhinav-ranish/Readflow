'use client';
import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import styles from './DownloadButtons.module.css';

interface DownloadButtonsProps {
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
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
    color: #1f2328;
    word-spacing: 0.1em;
    letter-spacing: normal;
    white-space: pre-wrap;
    page-break-after: avoid;
}
h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
h3 { font-size: 1.25em; }
h4 { font-size: 1em; }
h5 { font-size: 0.875em; }
h6 { font-size: 0.85em; color: #656d76; }
p { margin-bottom: 16px; }
a { color: #0969da; text-decoration: none; }
strong, b { font-weight: 600; }
em, i { font-style: italic; }
code {
    padding: 0.2em 0.4em;
    font-size: 85%;
    background-color: #eff1f3;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
    color: #1f2328;
}
pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 6px;
    margin-bottom: 16px;
    border: 1px solid #d1d9e0;
    white-space: pre-wrap;
    word-break: break-word;
    page-break-inside: avoid;
}
pre code {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: 100%;
    white-space: pre-wrap;
    word-break: break-word;
}
blockquote {
    padding: 0 1em;
    color: #656d76;
    border-left: 0.25em solid #d1d9e0;
    margin: 0 0 16px 0;
}
ul, ol { padding-left: 2em; margin-bottom: 16px; }
li { margin-bottom: 4px; }
li > ul, li > ol { margin-bottom: 0; }
table {
    border-spacing: 0;
    border-collapse: collapse;
    margin-bottom: 16px;
    width: 100%;
}
table th, table td {
    padding: 6px 13px;
    border: 1px solid #d1d9e0;
}
table th { font-weight: 600; background-color: #f6f8fa; }
table tr:nth-child(2n) { background-color: #f6f8fa; }
hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #d1d9e0;
    border: 0;
}
img { max-width: 100%; }
del { text-decoration: line-through; color: #656d76; }
li { page-break-inside: avoid; }
blockquote { page-break-inside: avoid; }
tr { page-break-inside: avoid; }
`;

export default function DownloadButtons({ content, title }: DownloadButtonsProps) {
    const [pdfLoading, setPdfLoading] = useState(false);

    const filename = title || 'README';

    const handleDownloadReadme = () => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = async () => {
        setPdfLoading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;

            // Get the rendered markdown HTML
            const previewEl = document.querySelector('[data-preview-content]');
            if (!previewEl) return;

            // Extract raw HTML and strip all class/style attributes
            // This removes every CSS module class that carries dark theme styles
            const rawHtml = previewEl.innerHTML;
            const cleanHtml = rawHtml
                .replace(/\s*class="[^"]*"/g, '')
                .replace(/\s*style="[^"]*"/g, '')
                .replace(/\s*data-[a-z-]*="[^"]*"/g, '');

            // Build a fully self-contained light-mode document
            const container = document.createElement('div');
            container.innerHTML = `
                <style>${PDF_STYLES}</style>
                <div style="background:#ffffff;color:#1f2328;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;">
                    ${cleanHtml}
                </div>
            `;

            // Must be in DOM for html2canvas to measure, but hidden
            // Fix html2canvas space-eating bug in headings:
            // Replace regular spaces with non-breaking spaces in heading text nodes
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
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak: { mode: ['css'], avoid: ['h1','h2','h3','h4','h5','h6','pre','blockquote','li','tr'] },
            };

            const target = container.querySelector('div') as HTMLElement;
            await html2pdf().set(opt).from(target).save();

            document.body.removeChild(container);
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
                <span>Download .md</span>
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

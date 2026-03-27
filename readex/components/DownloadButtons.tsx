'use client';
import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import styles from './DownloadButtons.module.css';

interface DownloadButtonsProps {
    content: string;
    title?: string;
}

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

            const previewEl = document.querySelector('[data-preview-content]');
            if (!previewEl) return;

            // Clone the element so we can style it for PDF without affecting the page
            const clone = previewEl.cloneNode(true) as HTMLElement;

            // Apply light-mode styles for clean PDF output
            clone.style.cssText = `
                background: white;
                color: #1f2328;
                padding: 32px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                max-width: 800px;
            `;

            // Override dark theme colors in the clone
            const allEls = clone.querySelectorAll('*');
            allEls.forEach((el) => {
                const htmlEl = el as HTMLElement;
                const computed = window.getComputedStyle(el);
                // Reset backgrounds that are dark-themed
                if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    const bg = computed.backgroundColor;
                    if (bg.includes('13, 17, 23') || bg.includes('1, 4, 9') || bg.includes('22, 27, 34')) {
                        htmlEl.style.backgroundColor = '#f6f8fa';
                    }
                }
                // Reset text colors that are light-on-dark
                if (computed.color) {
                    const c = computed.color;
                    if (c.includes('201, 209, 217') || c.includes('139, 148, 158')) {
                        htmlEl.style.color = '#1f2328';
                    }
                }
                // Fix border colors
                if (computed.borderColor && computed.borderColor.includes('48, 54, 61')) {
                    htmlEl.style.borderColor = '#d0d7de';
                }
            });

            // Fix headings border
            clone.querySelectorAll('h1, h2').forEach((el) => {
                (el as HTMLElement).style.borderBottomColor = '#d0d7de';
            });

            // Fix code blocks
            clone.querySelectorAll('pre').forEach((el) => {
                (el as HTMLElement).style.backgroundColor = '#f6f8fa';
                (el as HTMLElement).style.color = '#1f2328';
            });

            clone.querySelectorAll('code').forEach((el) => {
                const parent = el.parentElement;
                if (parent && parent.tagName !== 'PRE') {
                    (el as HTMLElement).style.backgroundColor = '#eff1f3';
                    (el as HTMLElement).style.color = '#1f2328';
                }
            });

            // Fix links
            clone.querySelectorAll('a').forEach((el) => {
                (el as HTMLElement).style.color = '#0969da';
            });

            // Fix blockquotes
            clone.querySelectorAll('blockquote').forEach((el) => {
                (el as HTMLElement).style.color = '#656d76';
                (el as HTMLElement).style.borderLeftColor = '#d0d7de';
            });

            const opt = {
                margin: [10, 10, 10, 10],
                filename: `${filename}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            };

            await html2pdf().set(opt).from(clone).save();
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

'use client';
import React, { useState } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import styles from './AiAssistant.module.css';

interface AiAssistantProps {
    content: string;
    onInsert: (text: string) => void;
    selection?: string;
}

const COMMANDS = [
    { id: 'summarize', label: 'Summarize', desc: 'Create a concise summary' },
    { id: 'expand', label: 'Expand', desc: 'Add more detail and examples' },
    { id: 'fix-grammar', label: 'Fix Grammar', desc: 'Correct spelling and grammar' },
    { id: 'polish', label: 'Polish', desc: 'Clean up formatting and structure' },
    { id: 'generate-table', label: 'Generate Table', desc: 'Convert to markdown table' },
    { id: 'translate', label: 'Translate', desc: 'Translate to another language' },
    { id: 'generate-from-url', label: 'Generate Docs', desc: 'Generate docs from description' },
] as const;

export default function AiAssistant({ content, onInsert, selection }: AiAssistantProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [mode, setMode] = useState<'commands' | 'chat' | 'result'>('commands');

    const runCommand = async (command: string, extra?: string) => {
        setLoading(true);
        setError(null);
        setResult('');
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command,
                    content: selection || content,
                    language: extra,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            setResult(data.result);
            setMode('result');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChat = async () => {
        if (!chatInput.trim()) return;
        await runCommand('chat', undefined);
        // For chat, we send the chat input as content
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: 'chat',
                    content: `Document:\n${content}\n\nQuestion: ${chatInput}`,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            setResult(data.result);
            setMode('result');
            setChatInput('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleInsert = () => {
        onInsert(result);
        setResult('');
        setMode('commands');
    };

    if (!isOpen) {
        return (
            <button className={styles.trigger} onClick={() => setIsOpen(true)} title="AI Assistant">
                <Sparkles size={16} />
            </button>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Sparkles size={14} />
                    <span>AI Assistant</span>
                </div>
                <button className={styles.closeBtn} onClick={() => { setIsOpen(false); setMode('commands'); setResult(''); }}>
                    <X size={16} />
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {loading && (
                <div className={styles.loading}>
                    <Loader2 size={18} className={styles.spin} />
                    <span>Thinking...</span>
                </div>
            )}

            {!loading && mode === 'commands' && (
                <>
                    <div className={styles.commands}>
                        {COMMANDS.map(cmd => (
                            <button
                                key={cmd.id}
                                className={styles.cmdBtn}
                                onClick={() => {
                                    if (cmd.id === 'translate') {
                                        const lang = prompt('Translate to which language?');
                                        if (lang) runCommand(cmd.id, lang);
                                    } else {
                                        runCommand(cmd.id);
                                    }
                                }}
                            >
                                <span className={styles.cmdLabel}>{cmd.label}</span>
                                <span className={styles.cmdDesc}>{cmd.desc}</span>
                            </button>
                        ))}
                    </div>
                    <div className={styles.chatBar}>
                        <input
                            className={styles.chatInput}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask about your document..."
                            onKeyDown={e => { if (e.key === 'Enter') handleChat(); }}
                        />
                        <button className={styles.chatSend} onClick={handleChat} disabled={!chatInput.trim()}>
                            <Send size={14} />
                        </button>
                    </div>
                    {selection && (
                        <div className={styles.selectionHint}>
                            Using selected text ({selection.length} chars)
                        </div>
                    )}
                </>
            )}

            {!loading && mode === 'result' && (
                <div className={styles.resultArea}>
                    <pre className={styles.resultText}>{result}</pre>
                    <div className={styles.resultActions}>
                        <button className={styles.insertBtn} onClick={handleInsert}>
                            Insert into editor
                        </button>
                        <button className={styles.backBtn} onClick={() => { setMode('commands'); setResult(''); }}>
                            Back
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

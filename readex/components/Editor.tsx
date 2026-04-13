'use client';
import React, { useMemo, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import styles from './Editor.module.css';

interface EditorProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
}

const BASIC_SETUP = {
    lineNumbers: false,
    foldGutter: false,
    highlightActiveLine: false,
};

function useEditorTheme() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const check = () => {
            const attr = document.documentElement.getAttribute('data-theme');
            if (attr) return attr === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        };
        setIsDark(check());

        const observer = new MutationObserver(() => setIsDark(check()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => setIsDark(check());
        mq.addEventListener('change', handler);

        return () => {
            observer.disconnect();
            mq.removeEventListener('change', handler);
        };
    }, []);

    return isDark;
}

export default function Editor({ value, onChange, className }: EditorProps) {
    const isDark = useEditorTheme();
    const extensions = useMemo(
        () => [markdown({ base: markdownLanguage, codeLanguages: languages })],
        []
    );

    return (
        <div className={`${styles.editorWrapper}${className ? ` ${className}` : ''}`}>
            <CodeMirror
                value={value}
                height="100%"
                theme={isDark ? githubDark : githubLight}
                extensions={extensions}
                onChange={onChange}
                className={styles.codeMirror}
                basicSetup={BASIC_SETUP}
            />
        </div>
    );
}

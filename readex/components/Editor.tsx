'use client';
import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { githubDark } from '@uiw/codemirror-theme-github';
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

export default function Editor({ value, onChange, className }: EditorProps) {
    const extensions = useMemo(
        () => [markdown({ base: markdownLanguage, codeLanguages: languages })],
        []
    );

    return (
        <div className={`${styles.editorWrapper}${className ? ` ${className}` : ''}`}>
            <CodeMirror
                value={value}
                height="100%"
                theme={githubDark}
                extensions={extensions}
                onChange={onChange}
                className={styles.codeMirror}
                basicSetup={BASIC_SETUP}
            />
        </div>
    );
}

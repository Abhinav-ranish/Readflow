'use client';
import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { githubDark } from '@uiw/codemirror-theme-github';

interface EditorProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
}

export default function Editor({ value, onChange, className }: EditorProps) {
    return (
        <div className={className} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CodeMirror
                value={value}
                height="100%"
                theme={githubDark}
                extensions={[
                    markdown({ base: markdownLanguage, codeLanguages: languages })
                ]}
                onChange={onChange}
                style={{ flex: 1, overflow: 'hidden', fontSize: '15px' }}
                basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    highlightActiveLine: false,
                }}
            />
        </div>
    );
}

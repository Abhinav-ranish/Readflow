'use client';
import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import styles from './TemplateSelector.module.css';

const TEMPLATES: { name: string; description: string; content: string }[] = [
    {
        name: 'README',
        description: 'Project README with badges and sections',
        content: `# Project Name

[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

> A brief description of what this project does.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage

Describe how to use the project here.

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/api/items\` | GET | List all items |
| \`/api/items/:id\` | GET | Get item by ID |

## Contributing

1. Fork the repo
2. Create your feature branch (\`git checkout -b feature/amazing\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing\`)
5. Open a Pull Request

## License

MIT
`,
    },
    {
        name: 'RFC',
        description: 'Request for Comments proposal',
        content: `# RFC: [Title]

**Author:** [Name]
**Status:** Draft
**Created:** ${new Date().toISOString().split('T')[0]}

## Summary

One paragraph explanation of the proposal.

## Motivation

Why are we doing this? What use cases does it support?

## Detailed Design

Explain the design in detail. Include:

- API changes
- Data model changes
- Migration strategy

## Drawbacks

Why should we *not* do this?

## Alternatives

What other designs have been considered?

## Unresolved Questions

What parts of the design are still TBD?
`,
    },
    {
        name: 'Changelog',
        description: 'Keep a Changelog format',
        content: `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- New feature description

### Changed
- Updated feature description

### Fixed
- Bug fix description

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
`,
    },
    {
        name: 'Meeting Notes',
        description: 'Structured meeting notes template',
        content: `# Meeting Notes — ${new Date().toISOString().split('T')[0]}

**Attendees:** [Names]
**Duration:** 30 min

## Agenda

1. Topic one
2. Topic two
3. Topic three

## Discussion

### Topic One

Key points discussed:
- Point A
- Point B

### Topic Two

Key points discussed:
- Point A
- Point B

## Action Items

- [ ] **[Owner]** — Task description (due: date)
- [ ] **[Owner]** — Task description (due: date)

## Next Meeting

**Date:** TBD
**Topics:** TBD
`,
    },
    {
        name: 'ADR',
        description: 'Architecture Decision Record',
        content: `# ADR-001: [Decision Title]

**Status:** Proposed
**Date:** ${new Date().toISOString().split('T')[0]}
**Deciders:** [Names]

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
- Benefit one
- Benefit two

### Negative
- Tradeoff one
- Tradeoff two

### Neutral
- Side effect one
`,
    },
    {
        name: 'Runbook',
        description: 'Incident response runbook',
        content: `# Runbook: [Service/Issue Name]

**Severity:** P1 / P2 / P3
**Owner:** [Team/Person]
**Last Updated:** ${new Date().toISOString().split('T')[0]}

## Symptoms

- What does the alert look like?
- What do users see?

## Impact

- Which users/services are affected?
- Estimated blast radius

## Diagnosis

1. Check service health: \`curl https://api.example.com/health\`
2. Check logs: \`kubectl logs -f deployment/service\`
3. Check metrics dashboard: [link]

## Mitigation

### Quick Fix
1. Step one
2. Step two

### Rollback
\`\`\`bash
kubectl rollout undo deployment/service
\`\`\`

## Root Cause Analysis

To be filled after incident resolution.

## Prevention

Steps to prevent recurrence.
`,
    },
];

interface TemplateSelectorProps {
    onSelect: (content: string) => void;
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (content: string) => {
        onSelect(content);
        setIsOpen(false);
    };

    return (
        <>
            <button
                className={styles.triggerButton}
                onClick={() => setIsOpen(true)}
                title="Start from a template"
            >
                <FileText size={16} />
                <span className={styles.triggerLabel}>Templates</span>
            </button>

            {isOpen && (
                <div
                    className={styles.overlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className={styles.modal}>
                        <button
                            className={styles.closeButton}
                            onClick={() => setIsOpen(false)}
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                        <h3 className={styles.title}>Start from a template</h3>
                        <p className={styles.subtitle}>
                            Choose a template to pre-fill the editor. This will replace your current content.
                        </p>
                        <div className={styles.grid}>
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.name}
                                    className={styles.card}
                                    onClick={() => handleSelect(t.content)}
                                >
                                    <span className={styles.cardName}>{t.name}</span>
                                    <span className={styles.cardDesc}>{t.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

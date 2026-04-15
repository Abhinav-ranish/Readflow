// Wiki-link parser for project-scoped document linking
// Parses [[Note Name]] patterns from markdown content

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

/** Extract all unique wiki-link targets from markdown content */
export function parseWikiLinks(content: string): string[] {
    const links: string[] = [];
    let match;
    while ((match = WIKILINK_REGEX.exec(content)) !== null) {
        const target = match[1].trim();
        if (target) links.push(target);
    }
    return [...new Set(links)];
}

/** Resolve wiki-link targets to doc IDs using a title-to-id map */
export function resolveWikiLinks(
    content: string,
    titleToDoc: Map<string, { id: string; title: string }>
): { targetId: string; linkText: string }[] {
    const targets = parseWikiLinks(content);
    const resolved: { targetId: string; linkText: string }[] = [];

    for (const target of targets) {
        // Case-insensitive lookup
        const lower = target.toLowerCase();
        for (const [title, doc] of titleToDoc.entries()) {
            if (title.toLowerCase() === lower) {
                resolved.push({ targetId: doc.id, linkText: target });
                break;
            }
        }
    }

    return resolved;
}

/** Replace [[wiki-links]] in markdown with actual links for rendering */
export function renderWikiLinks(
    content: string,
    titleToDoc: Map<string, { id: string; title: string }>,
    projectId: string
): string {
    return content.replace(WIKILINK_REGEX, (_match, target: string) => {
        const trimmed = target.trim();
        const lower = trimmed.toLowerCase();

        for (const [title, doc] of titleToDoc.entries()) {
            if (title.toLowerCase() === lower) {
                return `[${trimmed}](/s/${doc.id})`;
            }
        }

        // Unresolved link — render as a "create" link
        return `[${trimmed}](/project/${projectId}?create=${encodeURIComponent(trimmed)})`;
    });
}

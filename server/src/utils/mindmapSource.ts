/**
 * Server copy of client/src/lib/mindmap/mindmapSource.ts#normalizeMindmapSource: makes AI-generated
 * Mermaid mindmap source renderable before it is stored.
 * - drops markdown fences / chatter before the "mindmap" keyword
 * - keeps the root as root((...)) and removes (), [], {} from other labels, which Mermaid reads as
 *   shape syntax ("Loi d'Ohm (U = RI)" made the whole map fail to render)
 */

const SHAPES: RegExp[] = [
    /^[\w-]*\(\((.*)\)\)$/,
    /^[\w-]*\)\)(.*)\(\($/,
    /^[\w-]*\{\{(.*)\}\}$/,
    /^[\w-]*\[(.*)\]$/,
    /^[\w-]*\((.*)\)$/,
    /^[\w-]*\)(.*)\($/,
];

const nodeLabel = (raw: string): string => {
    const text = raw.replace(/:::.*$/, '').trim();
    for (const pattern of SHAPES) {
        const match = text.match(pattern);
        if (match) return match[1].replace(/^["'`](.*)["'`]$/, '$1').trim();
    }
    return text.replace(/^["'`](.*)["'`]$/, '$1').trim();
};

const cleanLabel = (label: string) => label.replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();

export const normalizeMindmapSource = (source: string): string => {
    const lines = (source || '').replace(/```(?:mermaid)?/gi, '').split(/\r?\n/);
    const start = lines.findIndex(l => l.trim().toLowerCase() === 'mindmap');
    const body = (start >= 0 ? lines.slice(start + 1) : lines).filter(l => l.trim());
    if (body.length === 0) return 'mindmap';

    const out = ['mindmap'];
    body.forEach((line, index) => {
        const indent = line.match(/^\s*/)![0];
        const text = line.trim();
        if (/^::icon\(/.test(text) || /^%%/.test(text)) {
            out.push(line);
            return;
        }
        const label = cleanLabel(nodeLabel(text));
        if (!label) return;
        out.push(index === 0 ? `${indent}root((${label}))` : `${indent}${label}`);
    });
    return out.join('\n');
};

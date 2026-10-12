/**
 * Lightweight HTML → plain text conversion, kept out of the docx converter so that pages
 * needing text for AI generation don't pull the whole docx/mammoth bundle.
 */

export const BLOCK_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot',
    'tr', 'td', 'th', 'caption', 'colgroup', 'col', 'blockquote', 'pre', 'hr', 'div', 'section', 'article', 'main',
    'header', 'footer', 'nav', 'aside', 'figure', 'figcaption', 'address', 'details', 'summary',
    'dl', 'dt', 'dd', 'center', 'form', 'fieldset', 'legend'
]);
const TEXT_BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'blockquote', 'pre', 'div']);
export const SKIPPED_TAGS = new Set(['script', 'style', 'template', 'head', 'noscript', 'title', 'meta', 'link']);

/**
 * Extract plain text from HTML for search indexing and AI models.
 * Block elements (paragraphs, headings, list items, table rows...) are
 * separated by a newline so that `<p>Titre</p><p>Texte</p>` gives "Titre\nTexte".
 * Images (including inline base64 data) contribute no text.
 */
export function extractTextFromHtml(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const parts: string[] = [];

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parts.push((node.textContent || '').replace(/\s+/g, ' '));
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (SKIPPED_TAGS.has(tag)) return;
        if (tag === 'br') {
            parts.push('\n');
            return;
        }
        const isCell = tag === 'td' || tag === 'th';
        const isBlock = !isCell && (TEXT_BLOCK_TAGS.has(tag) || BLOCK_TAGS.has(tag));
        if (isBlock) parts.push('\n');
        for (const child of Array.from(el.childNodes)) walk(child);
        if (isCell) parts.push('\t');
        else if (isBlock) parts.push('\n');
    };

    for (const child of Array.from(doc.body.childNodes)) walk(child);

    return parts
        .join('')
        .split('\n')
        .map(line => line.replace(/[  ]+/g, ' ').replace(/[ \t]*\t[ \t]*/g, '\t').trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim();
}

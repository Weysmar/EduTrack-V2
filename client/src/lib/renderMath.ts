import katex from 'katex';

/**
 * Decodes common HTML entities that might appear inside HTML text nodes before KaTeX parsing.
 */
export function decodeMathEntities(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '\\&');
}

/**
 * Escapes HTML characters for error fallbacks.
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Safely renders a LaTeX mathematical string using KaTeX.
 */
export function renderKatex(tex: string, displayMode: boolean = false): string {
    const cleanTex = decodeMathEntities(tex.trim());
    if (!cleanTex) return '';

    try {
        const rendered = katex.renderToString(cleanTex, {
            displayMode,
            throwOnError: false,
            errorColor: '#ef4444',
            strict: false,
            trust: false
        });

        if (displayMode) {
            return `<div class="katex-display-wrapper my-4 overflow-x-auto overflow-y-hidden py-2 text-center select-text">${rendered}</div>`;
        }
        return `<span class="katex-inline-wrapper align-middle select-text">${rendered}</span>`;
    } catch {
        return `<span class="katex-error text-red-500 font-mono text-xs p-1 rounded bg-red-50 dark:bg-red-950/40" title="Erreur de formule">${escapeHtml(tex)}</span>`;
    }
}

/**
 * Replaces math delimiters in a plain text string with rendered KaTeX HTML.
 * Supports:
 * - Block math: $$ ... $$ and \[ ... \]
 * - Inline math: $ ... $ and \( ... \)
 */
export function renderMathInText(text: string): string {
    if (!text || (!text.includes('$') && !text.includes('\\['))) {
        return text;
    }

    let result = text;

    // 1. Block Math with $$ ... $$
    result = result.replace(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g, (_match, formula) => {
        return renderKatex(formula, true);
    });

    // 2. Block Math with \[ ... \]
    result = result.replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_match, formula) => {
        return renderKatex(formula, true);
    });

    // 3. Inline Math with \( ... \)
    result = result.replace(/(?<!\\)\\\(([\s\S]+?)(?<!\\)\\\)/g, (_match, formula) => {
        return renderKatex(formula, false);
    });

    // 4. Inline Math with $ ... $ (avoiding currency signs like $100 or $5.50)
    result = result.replace(/(?<!\\)\$(?!\s)([^$\r\n]+?)(?<!\s)\$(?!\d)/g, (match, formula) => {
        if (/^\s*\d+(?:[.,]\d+)?\s*$/.test(formula)) {
            return match; // Likely currency amount
        }
        return renderKatex(formula, false);
    });

    return result;
}

/**
 * Traverses an HTML string safely to replace math formulas inside text nodes only,
 * completely preserving code blocks (<pre>, <code>), script tags, and existing KaTeX elements.
 */
export function renderMathInHtml(html: string): string {
    if (!html || (!html.includes('$') && !html.includes('\\['))) {
        return html;
    }

    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        // Fallback for SSR or non-browser environments
        return renderMathInText(html);
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_ACCEPT;
                const tag = parent.tagName.toLowerCase();
                if (['code', 'pre', 'script', 'style', 'textarea', 'svg'].includes(tag)) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('code, pre, script, style, textarea, svg, .katex, .katex-display-wrapper')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const nodesToProcess: Node[] = [];
        while (walker.nextNode()) {
            const val = walker.currentNode.nodeValue;
            if (val && (val.includes('$') || val.includes('\\['))) {
                nodesToProcess.push(walker.currentNode);
            }
        }

        for (const textNode of nodesToProcess) {
            const originalText = textNode.nodeValue || '';
            const processedText = renderMathInText(originalText);
            if (processedText !== originalText && textNode.parentNode) {
                const span = doc.createElement('span');
                span.innerHTML = processedText;
                textNode.parentNode.replaceChild(span, textNode);
            }
        }

        return doc.body.innerHTML;
    } catch (e) {
        console.warn('Erreur lors du rendu des formules mathématiques dans le HTML:', e);
        return html;
    }
}

/**
 * DOMPurify tags and attributes configuration allowing full KaTeX HTML and MathML tags.
 */
export const KATEX_PURIFY_CONFIG = {
    ADD_TAGS: [
        'mark', 'img',
        // MathML tags
        'math', 'mrow', 'mfrac', 'mover', 'munder', 'munderover',
        'mo', 'mi', 'mn', 'msup', 'msub', 'msubsup', 'mtext', 'mspace',
        'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mpadded', 'mphantom',
        'mstyle', 'mglyph', 'annotation', 'semantics',
        // SVG elements KaTeX might use
        'svg', 'path', 'line'
    ],
    ADD_ATTR: [
        'target', 'src', 'alt', 'title', 'class', 'style', 'width', 'height',
        // KaTeX MathML / SVG attributes
        'display', 'xmlns', 'accent', 'aria-hidden', 'encoding',
        'viewBox', 'd', 'fill', 'stroke', 'stroke-width'
    ]
};

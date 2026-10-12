/**
 * Plain text from editor (Tiptap) HTML, for AI prompts. Images are dropped entirely: notes inline
 * pasted pictures as base64 data URLs, which otherwise flooded the prompt with meaningless characters.
 */
export const htmlToText = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|ul|ol|table)>/gi, '\n')
        .replace(/<\/t[dh]>/gi, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .split('\n')
        .map(line => line.replace(/[  ]+/g, ' ').trim())
        .filter(line => line.length > 0)
        .join('\n');
};

const PAGE_MARKER = /---\s*Page\s+\d+[^-]*---/gi;

/** True when cached extracted text holds real content (not just PDF "--- Page N ---" markers) */
export const hasMeaningfulText = (text?: string | null): boolean =>
    !!text && text.replace(PAGE_MARKER, '').replace(/\s+/g, '').length >= 20;

/**
 * Normalizes and formats AI-generated summary markdown so that
 * bullet points, sub-bullets, and headings break lines cleanly.
 */
export function formatSummaryMarkdown(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';

    let text = raw.replace(/\r\n/g, '\n');

    // 1. Convert sub-bullet symbols (▫, ◦, ▪, ‣, ⁃, etc.) into indented markdown list items: '\n  - '
    text = text.replace(/[ \t]*[▫◦▪‣⁃][ \t]*/g, '\n  - ');

    // 2. Convert primary bullet symbols (•) into standard markdown list items: '\n- '
    // At line start or preceded by newline/whitespace
    text = text.replace(/(?:^|\n)[ \t]*•[ \t]*/g, '\n- ');
    // Any remaining inline • used as a bullet separator between sentences
    text = text.replace(/[ \t]+•[ \t]+/g, '\n- ');

    // 3. If a title or author line ends with ":" and is directly followed by a sub-item, break cleanly onto a new indented line
    // e.g. "Sun Tzu : - Subpoint" -> "Sun Tzu :\n  - Subpoint"
    text = text.replace(/:\s*\n?[ \t]*-\s+/g, ':\n  - ');

    // 4. Ensure headers (#, ##, ###) always have a clean preceding double line break
    text = text.replace(/([^\n])\n?(#{1,4}\s)/g, '$1\n\n$2');

    // 5. Clean up excessive consecutive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

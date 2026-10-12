/**
 * Client-side export of a flashcard deck to a tab-separated text file that Anki
 * can import (File > Import). One note per line: front<TAB>back.
 *
 * Fields are HTML-escaped and line breaks become <br>, with the `#html:true`
 * header so Anki renders them as written (no HTML injection from card content).
 */

export interface ExportableCard {
    front?: string | null;
    back?: string | null;
}

export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Makes a single field safe for one TSV line. */
export const toAnkiField = (value: string | null | undefined): string =>
    escapeHtml(String(value ?? '').replace(/\r\n?/g, '\n').trim())
        .replace(/\t/g, '    ')
        .replace(/\n/g, '<br>');

/** Header values cannot contain line breaks. */
const toHeaderValue = (value: string) => value.replace(/[\r\n\t]+/g, ' ').trim();

export function buildAnkiExport(deckName: string, cards: ExportableCard[]): string {
    const lines = ['#separator:tab', '#html:true'];
    const deck = toHeaderValue(deckName || '');
    if (deck) lines.push(`#deck:${deck}`);
    for (const card of cards) {
        const front = toAnkiField(card.front);
        const back = toAnkiField(card.back);
        if (!front && !back) continue;
        lines.push(`${front}\t${back}`);
    }
    return lines.join('\n') + '\n';
}

export const ankiFileName = (deckName: string): string => {
    const base = (deckName || 'flashcards')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9-_ ]+/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80);
    return `${base || 'flashcards'}-anki.txt`;
};

/** Triggers a browser download of the export. */
export function downloadAnkiExport(deckName: string, cards: ExportableCard[]): number {
    const exportable = cards.filter(c => (c.front ?? '').trim() || (c.back ?? '').trim());
    const content = buildAnkiExport(deckName, exportable);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ankiFileName(deckName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return exportable.length;
}

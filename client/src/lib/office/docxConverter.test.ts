import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { convertHtmlToDocxBlob, extractTextFromHtml } from './docxConverter';

// 1x1 transparent PNG
const PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

async function unzipDocx(html: string) {
    const blob = await convertHtmlToDocxBlob(html, 'Test');
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')!.async('text');
    return { zip, documentXml };
}

describe('convertHtmlToDocxBlob', () => {
    it('keeps TipTap tables wrapped in div.tableWrapper', async () => {
        const html =
            '<p>Avant</p><div class="tableWrapper"><table><colgroup><col style="min-width: 25px"><col style="min-width: 25px"></colgroup><tbody>' +
            '<tr><th colspan="1" rowspan="1"><p>Nom</p></th><th><p>Note</p></th></tr>' +
            '<tr><td><p>Alice</p><p>Deuxième ligne</p></td><td><ul><li><p>Puce</p></li></ul></td></tr>' +
            '<tr><td colspan="2"><p>Fusion</p></td></tr>' +
            '</tbody></table></div><p>Après</p>';
        const { documentXml } = await unzipDocx(html);
        expect(documentXml).toContain('<w:tbl>');
        for (const text of ['Avant', 'Nom', 'Note', 'Alice', 'Deuxième ligne', 'Puce', 'Fusion', 'Après']) {
            expect(documentXml).toContain(text);
        }
        expect(documentXml).toContain('<w:gridSpan w:val="2"/>');
        // "Alice" and "Deuxième ligne" stay distinct paragraphs inside the cell
        expect(documentXml).toMatch(/Alice<\/w:t><\/w:r><\/w:p><w:p>/);
    });

    it('honors rowspan with vertical merges', async () => {
        const html =
            '<table><tbody><tr><td rowspan="2">A</td><td>B</td></tr><tr><td>C</td></tr></tbody></table>';
        const { documentXml } = await unzipDocx(html);
        expect(documentXml).toContain('<w:vMerge w:val="restart"/>');
        expect(documentXml).toContain('<w:vMerge w:val="continue"/>');
    });

    it('embeds PNG data-URL images (block and inline)', async () => {
        const html = `<img src="${PNG_DATA_URL}" alt="pixel"><p>Texte <img src="${PNG_DATA_URL}" width="50"> fin</p>`;
        const { zip, documentXml } = await unzipDocx(html);
        const media = Object.keys(zip.files).filter(name => name.startsWith('word/media/'));
        expect(media.length).toBeGreaterThan(0);
        expect(documentXml).toContain('<w:drawing>');
        expect(documentXml).toContain('Texte');
        expect(documentXml).toContain('fin');
    });

    it('skips broken or unrasterizable images without throwing', async () => {
        const html =
            '<p>Début</p>' +
            '<img src="data:image/png;base64,@@@notbase64">' +
            '<img src="data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22%3E%3C/svg%3E">' +
            '<img src="data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=">' +
            '<p>Fin</p>';
        const { documentXml } = await unzipDocx(html);
        expect(documentXml).toContain('Début');
        expect(documentXml).toContain('Fin');
    });

    it('converts <br> to line breaks and <hr> to a bordered paragraph', async () => {
        const { documentXml } = await unzipDocx('<p>Ligne 1<br>Ligne 2</p><hr><p>Suite</p>');
        expect(documentXml).toContain('<w:br/>');
        expect(documentXml).toContain('Ligne 1');
        expect(documentXml).toContain('Ligne 2');
        expect(documentXml).toMatch(/<w:pBdr><w:bottom /);
    });

    it('keeps nested list text with distinct levels and real numbering', async () => {
        const html =
            '<ul><li><p>Parent</p><ul><li><p>Enfant</p><ol><li><p>Petit-enfant</p></li></ol></li></ul></li><li><p>Second</p></li></ul>' +
            '<ol><li><p>Un</p></li><li><p>Deux</p><ol><li><p>Deux.un</p></li></ol></li></ol>';
        const { zip, documentXml } = await unzipDocx(html);
        for (const text of ['Parent', 'Enfant', 'Petit-enfant', 'Second', 'Un', 'Deux', 'Deux.un']) {
            expect(documentXml).toContain(`>${text}<`);
        }
        expect(documentXml).toContain('<w:ilvl w:val="0"/>');
        expect(documentXml).toContain('<w:ilvl w:val="1"/>');
        expect(documentXml).toContain('<w:ilvl w:val="2"/>');
        // No hand-written "1. " prefix anymore
        expect(documentXml).not.toContain('>1. <');
        const numberingXml = await zip.file('word/numbering.xml')!.async('text');
        expect(numberingXml).toContain('<w:numFmt w:val="decimal"/>');
    });

    it('keeps inline formatting: color, highlight, font, links, code', async () => {
        const html =
            '<p><span style="color: #FF0000">rouge</span> <span style="color: rgb(0, 128, 255)">bleu</span> ' +
            '<mark data-color="#fef08a" style="background-color: #fef08a; color: inherit">surligné</mark> ' +
            '<span style="font-family: Georgia, serif">police</span> <strong><em><u><s>tout</s></u></em></strong> ' +
            '<code>x = 1</code> <a href="https://example.com">lien</a></p>';
        const { zip, documentXml } = await unzipDocx(html);
        expect(documentXml).toContain('<w:color w:val="FF0000"/>');
        expect(documentXml).toContain('<w:color w:val="0080FF"/>');
        expect(documentXml).toMatch(/<w:shd [^>]*w:fill="FEF08A"/);
        expect(documentXml).toContain('w:ascii="Georgia"');
        expect(documentXml).toContain('<w:b/>');
        expect(documentXml).toContain('<w:i/>');
        expect(documentXml).toContain('<w:strike/>');
        expect(documentXml).toContain('w:ascii="Courier New"');
        expect(documentXml).toContain('<w:hyperlink');
        const rels = await zip.file('word/_rels/document.xml.rels')!.async('text');
        expect(rels).toContain('https://example.com');
    });

    it('handles headings h1-h6, blockquote, code blocks and loose text', async () => {
        const html =
            'Texte libre<h1>T1</h1><h4>T4</h4><h6>T6</h6><blockquote><p>Citation</p></blockquote>' +
            '<pre><code>ligne a\nligne b</code></pre><div>Dans un div<p style="text-align: center">Centré</p></div>';
        const { documentXml } = await unzipDocx(html);
        expect(documentXml).toContain('Texte libre');
        expect(documentXml).toContain('<w:pStyle w:val="Heading1"/>');
        expect(documentXml).toContain('<w:pStyle w:val="Heading4"/>');
        expect(documentXml).toContain('<w:pStyle w:val="Heading6"/>');
        expect(documentXml).toContain('Citation');
        expect(documentXml).toContain('ligne a');
        expect(documentXml).toContain('ligne b');
        expect(documentXml).toContain('Dans un div');
        expect(documentXml).toContain('<w:jc w:val="center"/>');
    });

    it('round-trips through mammoth (DOCX -> HTML) without losing structure', async () => {
        const html =
            '<h2>Titre</h2><p>Un <strong>gras</strong> et <a href="https://example.com">lien</a></p>' +
            '<div class="tableWrapper"><table><tbody><tr><td><p>c1</p></td><td><p>c2</p></td></tr></tbody></table></div>' +
            `<img src="${PNG_DATA_URL}" alt="pixel">` +
            '<ol><li><p>Un</p><ol><li><p>Sous</p></li></ol></li></ol><ul><li><p>Puce</p></li></ul>';
        const blob = await convertHtmlToDocxBlob(html, 'Test');
        // mammoth's Node build (used under vitest) reads a Buffer rather than an ArrayBuffer
        const buffer = Buffer.from(await blob.arrayBuffer());
        const convertNode = mammoth.convertToHtml as unknown as (input: { buffer: Buffer }) => Promise<{ value: string }>;
        const back = (await convertNode({ buffer })).value;
        expect(back).toContain('<h2>Titre</h2>');
        expect(back).toContain('<strong>gras</strong>');
        expect(back).toContain('href="https://example.com"');
        expect(back).toMatch(/<table>.*c1.*c2.*<\/table>/s);
        expect(back).toContain('<img');
        expect(back).toMatch(/<ol><li>Un<ol><li>Sous<\/li><\/ol><\/li><\/ol>/);
        expect(back).toContain('<ul><li>Puce</li></ul>');
    });

    it('produces a valid document from empty HTML', async () => {
        const { documentXml } = await unzipDocx('');
        expect(documentXml).toContain('<w:body>');
    });
});

describe('extractTextFromHtml', () => {
    it('separates block elements with newlines', () => {
        expect(extractTextFromHtml('<p>Titre</p><p>Texte</p>')).toBe('Titre\nTexte');
    });

    it('handles lists, line breaks, headings and tables', () => {
        const text = extractTextFromHtml(
            '<h1>Titre</h1><ul><li><p>A</p></li><li><p>B</p></li></ul><p>x<br>y</p>' +
            '<div class="tableWrapper"><table><tr><td>c1</td><td>c2</td></tr></table></div>'
        );
        expect(text.split('\n')).toEqual(['Titre', 'A', 'B', 'x', 'y', 'c1\tc2']);
    });

    it('collapses inline whitespace', () => {
        expect(extractTextFromHtml('<p>  un   <strong>deux</strong>\n trois </p>')).toBe('un deux trois');
    });
});

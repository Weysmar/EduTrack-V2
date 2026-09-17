import mammoth from 'mammoth';
import JSZip from 'jszip';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    UnderlineType,
    AlignmentType
} from 'docx';

function getAlignment(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    let align = (el.style?.textAlign || el.getAttribute?.('align') || '').toLowerCase();
    if (!align && el.classList) {
        if (el.classList.contains('text-center')) align = 'center';
        else if (el.classList.contains('text-right')) align = 'right';
        else if (el.classList.contains('text-justify')) align = 'justify';
        else if (el.classList.contains('text-left')) align = 'left';
    }
    if (align === 'center') return AlignmentType.CENTER;
    if (align === 'right') return AlignmentType.RIGHT;
    if (align === 'justify') return AlignmentType.JUSTIFIED;
    if (align === 'left') return AlignmentType.LEFT;
    return undefined;
}

function normalizeAlignmentValue(val?: string | null): string | undefined {
    if (!val) return undefined;
    const v = val.toLowerCase().trim();
    if (v === 'center') return 'center';
    if (v === 'right' || v === 'end') return 'right';
    if (v === 'both' || v === 'distribute' || v === 'justify') return 'justify';
    if (v === 'left' || v === 'start') return 'left';
    return undefined;
}

interface DocxParagraphAlignment {
    text: string;
    align?: string;
}

async function extractDocxParagraphAlignments(arrayBuffer: ArrayBuffer): Promise<DocxParagraphAlignment[]> {
    try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const docFile = zip.file('word/document.xml');
        if (!docFile) return [];

        // 1. Parse styles.xml if available
        const stylesMap = new Map<string, string>();
        const stylesFile = zip.file('word/styles.xml');
        if (stylesFile) {
            try {
                const stylesXml = await stylesFile.async('text');
                const parser = new DOMParser();
                const doc = parser.parseFromString(stylesXml, 'application/xml');
                const styleElements = Array.from(doc.getElementsByTagNameNS('*', 'style'));
                const basedOnMap = new Map<string, string>();

                styleElements.forEach(style => {
                    const styleId = style.getAttribute('w:styleId') || style.getAttribute('styleId');
                    if (!styleId) return;

                    const basedOnEl = style.getElementsByTagNameNS('*', 'basedOn')[0];
                    if (basedOnEl) {
                        const basedOnId = basedOnEl.getAttribute('w:val') || basedOnEl.getAttribute('val');
                        if (basedOnId) basedOnMap.set(styleId, basedOnId);
                    }

                    const jcEl = style.getElementsByTagNameNS('*', 'jc')[0];
                    if (jcEl) {
                        const val = jcEl.getAttribute('w:val') || jcEl.getAttribute('val');
                        const norm = normalizeAlignmentValue(val);
                        if (norm) stylesMap.set(styleId, norm);
                    }
                });

                // Resolve basedOn inheritance (e.g. Title based on Normal)
                for (let round = 0; round < 5; round++) {
                    basedOnMap.forEach((parent, child) => {
                        if (!stylesMap.has(child) && stylesMap.has(parent)) {
                            stylesMap.set(child, stylesMap.get(parent)!);
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not parse styles.xml for alignments:', e);
            }
        }

        // 2. Parse document.xml for all <w:p>
        const docXml = await docFile.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXml, 'application/xml');
        const pElements = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));

        return pElements.map(p => {
            let align: string | undefined;

            const pPr = p.getElementsByTagNameNS('*', 'pPr')[0];
            if (pPr) {
                const jc = pPr.getElementsByTagNameNS('*', 'jc')[0];
                if (jc) {
                    const val = jc.getAttribute('w:val') || jc.getAttribute('val');
                    align = normalizeAlignmentValue(val);
                }

                if (!align) {
                    const pStyle = pPr.getElementsByTagNameNS('*', 'pStyle')[0];
                    if (pStyle) {
                        const styleId = pStyle.getAttribute('w:val') || pStyle.getAttribute('val');
                        if (styleId && stylesMap.has(styleId)) {
                            align = stylesMap.get(styleId);
                        }
                    }
                }
            }

            const tNodes = Array.from(p.getElementsByTagNameNS('*', 't'));
            const text = tNodes.map(t => t.textContent || '').join('').replace(/\s+/g, ' ').trim();

            return { text, align };
        });
    } catch (e) {
        console.warn('Error extracting docx alignments:', e);
        return [];
    }
}

function applyAlignmentsToHtml(html: string, docxParagraphs: DocxParagraphAlignment[]): string {
    if (!html || !docxParagraphs || docxParagraphs.length === 0) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const selector = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th';
    const allBlocks = Array.from(doc.body.querySelectorAll(selector)) as HTMLElement[];
    const leafBlocks = allBlocks.filter(el => !el.querySelector(selector));

    const nonEmptyDocx = docxParagraphs.filter(p => p.text.length > 0);
    let docxIdx = 0;

    for (const block of leafBlocks) {
        const text = (block.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        let matchedIdx = -1;

        // Search forward from docxIdx
        for (let i = docxIdx; i < nonEmptyDocx.length; i++) {
            const target = nonEmptyDocx[i];
            if (
                target.text === text ||
                target.text.startsWith(text) ||
                text.startsWith(target.text) ||
                (text.length > 8 && target.text.includes(text)) ||
                (target.text.length > 8 && text.includes(target.text))
            ) {
                matchedIdx = i;
                break;
            }
        }

        // If not found forward, search anywhere
        if (matchedIdx === -1) {
            for (let i = 0; i < nonEmptyDocx.length; i++) {
                const target = nonEmptyDocx[i];
                if (target.text === text) {
                    matchedIdx = i;
                    break;
                }
            }
        }

        if (matchedIdx !== -1) {
            const match = nonEmptyDocx[matchedIdx];
            if (match.align && match.align !== 'left') {
                block.style.textAlign = match.align;
                block.setAttribute('align', match.align);
                block.classList.add(`text-${match.align}`);
            }
            docxIdx = matchedIdx + 1;
        }
    }

    return doc.body.innerHTML;
}

/**
 * Convert a DOCX file ArrayBuffer into rich, semantic HTML using Mammoth,
 * preserving original paragraph and heading alignments (center, right, justify).
 */
export async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        // Run alignment extraction and Mammoth HTML conversion in parallel
        const [mammothResult, docxParagraphs] = await Promise.all([
            (async () => {
                // @ts-ignore
                const lib = mammoth.default || mammoth;
                const options = {
                    styleMap: [
                        "p[style-name='Title'] => h1:fresh",
                        "p[style-name='Subtitle'] => h2:fresh",
                        "p[style-name='Heading 1'] => h1:fresh",
                        "p[style-name='Heading 2'] => h2:fresh",
                        "p[style-name='Heading 3'] => h3:fresh",
                        "r[style-name='Strong'] => strong",
                        "r[style-name='Emphasis'] => em"
                    ]
                };
                return await lib.convertToHtml({ arrayBuffer }, options);
            })(),
            extractDocxParagraphAlignments(arrayBuffer)
        ]);

        let rawHtml = '';
        if (mammothResult.value && mammothResult.value.trim().length > 0) {
            rawHtml = mammothResult.value.trim();
        } else {
            // @ts-ignore
            const lib = mammoth.default || mammoth;
            const rawResult = await lib.extractRawText({ arrayBuffer });
            rawHtml = (rawResult.value || '')
                .split('\n')
                .filter((p: string) => p.trim().length > 0)
                .map((p: string) => `<p>${escapeHtml(p)}</p>`)
                .join('');
        }

        if (!rawHtml) return '<p></p>';

        // Enrich HTML elements with the extracted Word text alignments
        return applyAlignmentsToHtml(rawHtml, docxParagraphs);
    } catch (error) {
        console.error('Error converting DOCX to HTML:', error);
        throw new Error('Impossible de convertir le fichier Word en document éditable.');
    }
}

/**
 * Convert an ODT (OpenDocument Text) file ArrayBuffer into rich HTML.
 */
export async function convertOdtToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const contentFile = zip.file('content.xml');
        if (!contentFile) {
            throw new Error('Fichier ODT invalide (content.xml introuvable)');
        }

        const contentXml = await contentFile.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contentXml, 'application/xml');

        // Extract style alignments in ODT
        const odtStylesAlignMap = new Map<string, string>();
        const styleElements = Array.from(xmlDoc.querySelectorAll('style\\:style, style'));
        styleElements.forEach(style => {
            const name = style.getAttribute('style:name') || style.getAttribute('name');
            if (!name) return;
            const pProps = style.querySelector('style\\:paragraph-properties, paragraph-properties');
            if (pProps) {
                const align = pProps.getAttribute('fo:text-align') || pProps.getAttribute('text-align');
                const norm = normalizeAlignmentValue(align);
                if (norm) odtStylesAlignMap.set(name, norm);
            }
        });

        const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0] || xmlDoc.documentElement;
        const nodes = body.querySelectorAll('p, h, text\\:p, text\\:h, table\\:table, text\\:list');
        const htmlParts: string[] = [];

        nodes.forEach(node => {
            const tagName = node.localName.toLowerCase();
            const textContent = escapeHtml(node.textContent?.trim() || '');
            if (!textContent && tagName !== 'table') return;

            const styleName = node.getAttribute('text:style-name') || node.getAttribute('style-name');
            const align = styleName ? odtStylesAlignMap.get(styleName) : undefined;
            const alignAttr = align && align !== 'left' ? ` style="text-align: ${align}" align="${align}" class="text-${align}"` : '';

            if (tagName === 'h') {
                const outlineLevel = node.getAttribute('text:outline-level') || '1';
                const level = Math.min(Math.max(parseInt(outlineLevel, 10) || 1, 1), 3);
                htmlParts.push(`<h${level}${alignAttr}>${textContent}</h${level}>`);
            } else if (tagName === 'list') {
                const items = Array.from(node.querySelectorAll('text\\:list-item, list-item'));
                const listHtml = items
                    .map(item => `<li>${escapeHtml(item.textContent?.trim() || '')}</li>`)
                    .join('');
                htmlParts.push(`<ul>${listHtml}</ul>`);
            } else if (tagName === 'table') {
                const rows = Array.from(node.querySelectorAll('table\\:table-row, table-row'));
                const rowsHtml = rows.map(r => {
                    const cells = Array.from(r.querySelectorAll('table\\:table-cell, table-cell'));
                    const cellsHtml = cells.map(c => `<td>${escapeHtml(c.textContent?.trim() || '')}</td>`).join('');
                    return `<tr>${cellsHtml}</tr>`;
                }).join('');
                htmlParts.push(`<table border="1"><tbody>${rowsHtml}</tbody></table>`);
            } else {
                htmlParts.push(`<p${alignAttr}>${textContent}</p>`);
            }
        });

        return htmlParts.join('\n') || '<p></p>';
    } catch (error) {
        console.error('Error converting ODT to HTML:', error);
        throw new Error('Impossible de convertir le fichier ODT en document éditable.');
    }
}

/**
 * Extract plain text from HTML for search indexing and AI models.
 */
export function extractTextFromHtml(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Convert edited HTML from TipTap into a standard .docx binary Blob.
 */
export async function convertHtmlToDocxBlob(html: string, title: string = 'Document'): Promise<Blob> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bodyElements = Array.from(doc.body.childNodes);

    const docxChildren: (Paragraph | Table)[] = [];

    for (const node of bodyElements) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
                docxChildren.push(new Paragraph({
                    children: [new TextRun({ text, font: 'Calibri', size: 24 })],
                    spacing: { after: 120 }
                }));
            }
            continue;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        switch (tag) {
            case 'h1':
                docxChildren.push(new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    alignment: getAlignment(el),
                    children: parseInlineElements(el),
                    spacing: { before: 360, after: 160 }
                }));
                break;

            case 'h2':
                docxChildren.push(new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    alignment: getAlignment(el),
                    children: parseInlineElements(el),
                    spacing: { before: 280, after: 140 }
                }));
                break;

            case 'h3':
                docxChildren.push(new Paragraph({
                    heading: HeadingLevel.HEADING_3,
                    alignment: getAlignment(el),
                    children: parseInlineElements(el),
                    spacing: { before: 200, after: 100 }
                }));
                break;

            case 'ul':
                Array.from(el.querySelectorAll(':scope > li')).forEach(li => {
                    docxChildren.push(new Paragraph({
                        bullet: { level: 0 },
                        alignment: getAlignment(li as HTMLElement),
                        children: parseInlineElements(li as HTMLElement),
                        spacing: { after: 80 }
                    }));
                });
                break;

            case 'ol':
                Array.from(el.querySelectorAll(':scope > li')).forEach((li, idx) => {
                    docxChildren.push(new Paragraph({
                        alignment: getAlignment(li as HTMLElement),
                        children: [
                            new TextRun({ text: `${idx + 1}. `, bold: true, font: 'Calibri', size: 24 }),
                            ...parseInlineElements(li as HTMLElement)
                        ],
                        spacing: { after: 80 }
                    }));
                });
                break;

            case 'table': {
                const trElements = Array.from(el.querySelectorAll('tr'));
                if (trElements.length > 0) {
                    const tableRows = trElements.map(tr => {
                        const cellElements = Array.from(tr.querySelectorAll('th, td'));
                        const colCount = Math.max(cellElements.length, 1);
                        const cellWidthDxa = Math.floor(9000 / colCount);

                        const cells = cellElements.map(cell => {
                            const isHeader = cell.tagName.toLowerCase() === 'th';
                            return new TableCell({
                                width: { size: cellWidthDxa, type: WidthType.DXA },
                                children: [
                                    new Paragraph({
                                        alignment: getAlignment(cell as HTMLElement),
                                        children: parseInlineElements(cell as HTMLElement, isHeader)
                                    })
                                ]
                            });
                        });

                        return new TableRow({ children: cells });
                    });

                    docxChildren.push(new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));
                    docxChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));
                }
                break;
            }

            case 'blockquote':
                docxChildren.push(new Paragraph({
                    children: parseInlineElements(el, false, true),
                    alignment: getAlignment(el),
                    indent: { left: 720 },
                    spacing: { before: 120, after: 120 }
                }));
                break;

            default: {
                const runs = parseInlineElements(el);
                if (runs.length > 0) {
                    docxChildren.push(new Paragraph({
                        children: runs,
                        alignment: getAlignment(el),
                        spacing: { after: 120 }
                    }));
                }
                break;
            }
        }
    }

    if (docxChildren.length === 0) {
        docxChildren.push(new Paragraph({ text: '' }));
    }

    const docx = new Document({
        creator: 'EduTrack',
        title: title,
        description: 'Document édité au sein d’EduTrack',
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: docxChildren
            }
        ]
    });

    return await Packer.toBlob(docx);
}

/**
 * Recursively parse an inline HTML element into docx TextRuns.
 */
function parseInlineElements(
    container: HTMLElement,
    inheritedBold = false,
    inheritedItalic = false
): TextRun[] {
    const runs: TextRun[] = [];

    function walk(node: Node, bold: boolean, italic: boolean, underline: boolean, strike: boolean) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.length > 0) {
                runs.push(new TextRun({
                    text,
                    font: 'Calibri',
                    size: 24,
                    bold,
                    italics: italic,
                    underline: underline ? { type: UnderlineType.SINGLE } : undefined,
                    strike
                }));
            }
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        const isBold = bold || ['strong', 'b'].includes(tag);
        const isItalic = italic || ['em', 'i'].includes(tag);
        const isUnderline = underline || ['u'].includes(tag);
        const isStrike = strike || ['s', 'del', 'strike'].includes(tag);

        for (const child of Array.from(el.childNodes)) {
            walk(child, isBold, isItalic, isUnderline, isStrike);
        }
    }

    for (const child of Array.from(container.childNodes)) {
        walk(child, inheritedBold, inheritedItalic, false, false);
    }

    return runs;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

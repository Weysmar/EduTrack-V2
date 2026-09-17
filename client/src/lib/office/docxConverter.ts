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

/**
 * Convert a DOCX file ArrayBuffer into rich, semantic HTML using Mammoth.
 */
export async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
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

        const result = await lib.convertToHtml({ arrayBuffer }, options);
        if (result.value && result.value.trim().length > 0) {
            return result.value.trim();
        }

        // Fallback to raw text if HTML is empty
        const rawResult = await lib.extractRawText({ arrayBuffer });
        const paragraphs = (rawResult.value || '')
            .split('\n')
            .filter((p: string) => p.trim().length > 0)
            .map((p: string) => `<p>${escapeHtml(p)}</p>`)
            .join('');

        return paragraphs || '<p></p>';
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

        const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0] || xmlDoc.documentElement;
        const nodes = body.querySelectorAll('p, h, text\\:p, text\\:h, table\\:table, text\\:list');
        const htmlParts: string[] = [];

        nodes.forEach(node => {
            const tagName = node.localName.toLowerCase();
            const textContent = escapeHtml(node.textContent?.trim() || '');
            if (!textContent && tagName !== 'table') return;

            if (tagName === 'h') {
                const outlineLevel = node.getAttribute('text:outline-level') || '1';
                const level = Math.min(Math.max(parseInt(outlineLevel, 10) || 1, 1), 3);
                htmlParts.push(`<h${level}>${textContent}</h${level}>`);
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
                htmlParts.push(`<p>${textContent}</p>`);
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

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
    AlignmentType,
    ImageRun,
    ExternalHyperlink,
    LevelFormat,
    BorderStyle,
    ShadingType,
    HighlightColor,
    type ParagraphChild
} from 'docx';
import { BLOCK_TAGS, SKIPPED_TAGS, extractTextFromHtml } from '@/lib/htmlToText';

// Kept exported from here for existing callers
export { extractTextFromHtml };

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

// ---------------------------------------------------------------------------
// HTML (TipTap) -> DOCX
// ---------------------------------------------------------------------------

type AlignmentValue = (typeof AlignmentType)[keyof typeof AlignmentType];
type BlockChild = Paragraph | Table;

/** Printable width of an A4 page with 1 inch margins, in twips (dxa). */
const PRINTABLE_WIDTH_DXA = 11906 - 2 * 1440;
/** Maximum image width in pixels (≈ printable width at 96 dpi). */
const MAX_IMAGE_WIDTH_PX = 600;
const MAX_IMAGE_HEIGHT_PX = 900;
const LIST_INDENT_STEP = 720;
const LIST_HANGING = 360;
const CODE_FONT = 'Courier New';
const CODE_SHADING = 'F2F2F2';

const BLOCK_SELECTOR = Array.from(BLOCK_TAGS).join(',');

const HEADING_LEVELS: Record<string, { level: (typeof HeadingLevel)[keyof typeof HeadingLevel]; before: number; after: number }> = {
    h1: { level: HeadingLevel.HEADING_1, before: 360, after: 160 },
    h2: { level: HeadingLevel.HEADING_2, before: 280, after: 140 },
    h3: { level: HeadingLevel.HEADING_3, before: 200, after: 100 },
    h4: { level: HeadingLevel.HEADING_4, before: 180, after: 80 },
    h5: { level: HeadingLevel.HEADING_5, before: 160, after: 80 },
    h6: { level: HeadingLevel.HEADING_6, before: 160, after: 80 }
};

interface RunStyle {
    bold?: boolean;
    italics?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
    color?: string;
    highlight?: string;
    font?: string;
    size?: number;
    superScript?: boolean;
    subScript?: boolean;
    link?: boolean;
}

interface LoadedImage {
    type: 'png' | 'jpg' | 'gif' | 'bmp';
    data: Uint8Array;
    width: number;
    height: number;
    svg?: Uint8Array;
    alt?: string;
    title?: string;
}

interface NumberingState {
    nextInstance: number;
    references: Map<number, string>;
}

interface OrderedNumbering {
    reference: string;
    instance: number;
}

interface BlockContext {
    indent: number;
    align?: AlignmentValue;
    run: RunStyle;
    quote?: boolean;
    inTable?: boolean;
    availableWidth: number;
    images: Map<Element, LoadedImage | null>;
    numbering: NumberingState;
    olNumbering?: OrderedNumbering;
}

// ----------------------------- colors & styles -----------------------------

const NAMED_COLORS: Record<string, string> = {
    black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', lime: '00FF00', blue: '0000FF',
    yellow: 'FFFF00', cyan: '00FFFF', aqua: '00FFFF', magenta: 'FF00FF', fuchsia: 'FF00FF', gray: '808080',
    grey: '808080', silver: 'C0C0C0', maroon: '800000', olive: '808000', purple: '800080', teal: '008080',
    navy: '000080', orange: 'FFA500', pink: 'FFC0CB', brown: 'A52A2A', darkred: '8B0000', darkblue: '00008B',
    darkgreen: '006400', lightgray: 'D3D3D3', lightgrey: 'D3D3D3', darkgray: 'A9A9A9', darkgrey: 'A9A9A9',
    gold: 'FFD700', violet: 'EE82EE', indigo: '4B0082', lightblue: 'ADD8E6', lightgreen: '90EE90',
    lightyellow: 'FFFFE0', lightpink: 'FFB6C1'
};

/** Convert a CSS color (hex, rgb(), rgba(), named) to a 6-digit uppercase hex, or undefined. */
function parseCssColor(value?: string | null): string | undefined {
    if (!value) return undefined;
    const v = value.trim().toLowerCase().replace(/\s*!important$/, '');
    if (!v || v === 'transparent' || v === 'inherit' || v === 'initial' || v === 'currentcolor' || v === 'none') {
        return undefined;
    }
    if (v.startsWith('#')) {
        const hex = v.slice(1);
        if (/^[0-9a-f]{3,4}$/.test(hex)) {
            return hex.slice(0, 3).split('').map(c => c + c).join('').toUpperCase();
        }
        if (/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) {
            if (hex.length === 8 && hex.slice(6) === '00') return undefined;
            return hex.slice(0, 6).toUpperCase();
        }
        return undefined;
    }
    const fn = v.match(/^rgba?\(([^)]*)\)$/);
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
        if (parts.length < 3) return undefined;
        if (parts.length >= 4) {
            const a = parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
            if (!Number.isNaN(a) && a === 0) return undefined;
        }
        const channels = parts.slice(0, 3).map(p => {
            const n = p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p);
            return Math.max(0, Math.min(255, Math.round(Number.isNaN(n) ? 0 : n)));
        });
        return channels.map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    return NAMED_COLORS[v];
}

const HIGHLIGHT_BY_HEX: Record<string, (typeof HighlightColor)[keyof typeof HighlightColor]> = {
    FFFF00: HighlightColor.YELLOW,
    '00FF00': HighlightColor.GREEN,
    '00FFFF': HighlightColor.CYAN,
    FF00FF: HighlightColor.MAGENTA,
    '0000FF': HighlightColor.BLUE,
    FF0000: HighlightColor.RED,
    '000080': HighlightColor.DARK_BLUE,
    '008080': HighlightColor.DARK_CYAN,
    '008000': HighlightColor.DARK_GREEN,
    '800080': HighlightColor.DARK_MAGENTA,
    '800000': HighlightColor.DARK_RED,
    '808000': HighlightColor.DARK_YELLOW,
    '808080': HighlightColor.DARK_GRAY,
    C0C0C0: HighlightColor.LIGHT_GRAY,
    '000000': HighlightColor.BLACK
};

const GENERIC_FONTS: Record<string, string> = {
    monospace: CODE_FONT,
    serif: 'Times New Roman',
    'sans-serif': 'Arial',
    'system-ui': 'Calibri',
    'ui-sans-serif': 'Arial',
    'ui-serif': 'Times New Roman',
    'ui-monospace': CODE_FONT,
    cursive: 'Comic Sans MS'
};

function parseFontFamily(value?: string | null): string | undefined {
    if (!value) return undefined;
    const first = value.split(',')[0]?.trim().replace(/^["']|["']$/g, '').trim();
    if (!first || first === 'inherit' || first === 'initial') return undefined;
    return GENERIC_FONTS[first.toLowerCase()] || first;
}

/** Parse a CSS font-size to docx half-points. */
function parseFontSize(value?: string | null): number | undefined {
    if (!value) return undefined;
    const m = value.trim().match(/^([\d.]+)\s*(px|pt)?$/i);
    if (!m) return undefined;
    const n = parseFloat(m[1]);
    if (!n || Number.isNaN(n)) return undefined;
    const pt = (m[2] || 'px').toLowerCase() === 'pt' ? n : n * 0.75;
    return Math.max(2, Math.round(pt * 2));
}

function styleProp(el: HTMLElement, prop: string): string {
    try {
        return el.style?.getPropertyValue(prop) || '';
    } catch {
        return '';
    }
}

/** Compute the run style of an inline element on top of the inherited style. */
function deriveRunStyle(el: HTMLElement, tag: string, base: RunStyle): RunStyle {
    const style: RunStyle = { ...base };
    if (tag === 'strong' || tag === 'b') style.bold = true;
    if (tag === 'em' || tag === 'i' || tag === 'cite' || tag === 'var' || tag === 'dfn') style.italics = true;
    if (tag === 'u' || tag === 'ins') style.underline = true;
    if (tag === 's' || tag === 'del' || tag === 'strike') style.strike = true;
    if (tag === 'code' || tag === 'kbd' || tag === 'samp' || tag === 'tt') style.code = true;
    if (tag === 'sub') { style.subScript = true; style.superScript = false; }
    if (tag === 'sup') { style.superScript = true; style.subScript = false; }
    if (tag === 'mark') {
        style.highlight = parseCssColor(styleProp(el, 'background-color'))
            || parseCssColor(el.getAttribute('data-color'))
            || 'FFFF00';
    }
    if (tag === 'font') {
        const c = parseCssColor(el.getAttribute('color'));
        if (c) style.color = c;
        const f = parseFontFamily(el.getAttribute('face'));
        if (f) style.font = f;
    }

    const color = parseCssColor(styleProp(el, 'color'));
    if (color) style.color = color;
    if (tag !== 'mark') {
        const bg = parseCssColor(styleProp(el, 'background-color'));
        if (bg) style.highlight = bg;
    }
    const font = parseFontFamily(styleProp(el, 'font-family'));
    if (font) style.font = font;
    const size = parseFontSize(styleProp(el, 'font-size'));
    if (size) style.size = size;
    const weight = styleProp(el, 'font-weight').toLowerCase();
    if (weight === 'bold' || weight === 'bolder' || parseInt(weight, 10) >= 600) style.bold = true;
    else if (weight === 'normal' || (parseInt(weight, 10) > 0 && parseInt(weight, 10) < 600)) style.bold = false;
    const fontStyle = styleProp(el, 'font-style').toLowerCase();
    if (fontStyle === 'italic' || fontStyle === 'oblique') style.italics = true;
    const decoration = (styleProp(el, 'text-decoration') || styleProp(el, 'text-decoration-line')).toLowerCase();
    if (decoration.includes('underline')) style.underline = true;
    if (decoration.includes('line-through')) style.strike = true;
    return style;
}

function makeTextRun(text: string, style: RunStyle, extra: { break?: number } = {}): TextRun {
    const highlightName = style.highlight ? HIGHLIGHT_BY_HEX[style.highlight] : undefined;
    const shadingFill = style.highlight && !highlightName ? style.highlight : style.code ? CODE_SHADING : undefined;
    const color = style.color || (style.link ? '0563C1' : undefined);
    return new TextRun({
        text,
        ...extra,
        bold: style.bold || undefined,
        italics: style.italics || undefined,
        underline: style.underline || style.link ? { type: UnderlineType.SINGLE } : undefined,
        strike: style.strike || undefined,
        color,
        font: style.code ? CODE_FONT : style.font,
        size: style.size,
        superScript: style.superScript || undefined,
        subScript: style.subScript || undefined,
        highlight: highlightName,
        shading: shadingFill ? { type: ShadingType.CLEAR, color: 'auto', fill: shadingFill } : undefined,
        style: style.link ? 'Hyperlink' : undefined
    });
}

// --------------------------------- images ----------------------------------

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
}

function parseDataUrl(src: string): { mime: string; bytes: Uint8Array } | null {
    const m = src.match(/^data:([^,]*),(.*)$/s);
    if (!m) return null;
    const meta = m[1];
    const isBase64 = /;base64/i.test(meta);
    const mime = (meta.split(';')[0] || 'text/plain').trim().toLowerCase();
    if (isBase64) return { mime, bytes: base64ToBytes(m[2]) };
    return { mime, bytes: new TextEncoder().encode(decodeURIComponent(m[2])) };
}

type SniffedType = 'png' | 'jpg' | 'gif' | 'bmp' | 'webp' | 'svg' | 'unknown';

function sniffImageType(bytes: Uint8Array, mime = ''): SniffedType {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
    if (bytes.length >= 26 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp';
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
        && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
    if (mime.includes('svg')) return 'svg';
    const head = new TextDecoder().decode(bytes.subarray(0, 1024)).trimStart().toLowerCase();
    if (head.startsWith('<svg') || ((head.startsWith('<?xml') || head.startsWith('<!doctype')) && head.includes('<svg'))) return 'svg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('bmp')) return 'bmp';
    if (mime.includes('webp')) return 'webp';
    return 'unknown';
}

/** Read intrinsic pixel size from a raster image header. */
function readImageSize(bytes: Uint8Array, type: SniffedType): { width: number; height: number } | null {
    try {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (type === 'png' && bytes.length >= 24) {
            return { width: view.getUint32(16), height: view.getUint32(20) };
        }
        if (type === 'gif' && bytes.length >= 10) {
            return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
        }
        if (type === 'bmp' && bytes.length >= 26) {
            return { width: Math.abs(view.getInt32(18, true)), height: Math.abs(view.getInt32(22, true)) };
        }
        if (type === 'jpg') {
            let i = 2;
            while (i + 9 < bytes.length) {
                if (bytes[i] !== 0xff) { i++; continue; }
                const marker = bytes[i + 1];
                if (marker === 0xff) { i++; continue; }
                if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) { i += 2; continue; }
                const segLen = view.getUint16(i + 2);
                if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                    return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
                }
                i += 2 + segLen;
            }
        }
    } catch {
        /* ignore */
    }
    return null;
}

function readSvgSize(svgText: string): { width: number; height: number } | null {
    const root = svgText.match(/<svg\b[^>]*>/i)?.[0];
    if (!root) return null;
    const attr = (name: string) => root.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
    const num = (v?: string) => {
        if (!v || v.includes('%')) return undefined;
        const n = parseFloat(v);
        return n > 0 ? n : undefined;
    };
    const w = num(attr('width'));
    const h = num(attr('height'));
    const vb = attr('viewBox')?.split(/[\s,]+/).map(Number);
    const vbw = vb && vb.length === 4 && vb[2] > 0 ? vb[2] : undefined;
    const vbh = vb && vb.length === 4 && vb[3] > 0 ? vb[3] : undefined;
    if (w && h) return { width: w, height: h };
    if (w && vbw && vbh) return { width: w, height: (w * vbh) / vbw };
    if (h && vbw && vbh) return { width: (h * vbw) / vbh, height: h };
    if (vbw && vbh) return { width: vbw, height: vbh };
    return null;
}

/**
 * Rasterize an image (SVG, WebP...) to PNG using the browser canvas.
 * Returns null when canvas/Image are unavailable or decoding fails.
 */
async function rasterizeToPng(
    bytes: Uint8Array,
    mime: string,
    fallbackSize: { width: number; height: number } | null
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
    try {
        if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
        const canvas = document.createElement('canvas');
        const ctx2d = canvas.getContext?.('2d');
        if (!ctx2d || typeof canvas.toDataURL !== 'function') return null;

        const url = `data:${mime};base64,${bytesToBase64(bytes)}`;
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('image load timeout')), 5000);
            img.onload = () => { clearTimeout(timer); resolve(); };
            img.onerror = () => { clearTimeout(timer); reject(new Error('image load error')); };
            img.src = url;
        });

        const width = img.naturalWidth || fallbackSize?.width || 300;
        const height = img.naturalHeight || fallbackSize?.height || 150;
        // Render at 2x (bounded) for a crisp result once scaled down in Word.
        const scale = Math.max(1, Math.min(2, 2000 / Math.max(width, height)));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const parsed = parseDataUrl(pngUrl);
        if (!parsed || sniffImageType(parsed.bytes) !== 'png') return null;
        return { data: parsed.bytes, width, height };
    } catch (e) {
        console.warn('Image rasterization failed, image skipped:', e);
        return null;
    }
}

function parsePixelDimension(value?: string | null): number | undefined {
    if (!value) return undefined;
    const m = value.trim().match(/^([\d.]+)\s*(px)?$/i);
    if (!m) return undefined;
    const n = parseFloat(m[1]);
    return n > 0 ? n : undefined;
}

function computeDisplaySize(img: HTMLElement, natural: { width: number; height: number } | null): { width: number; height: number } {
    const attrW = parsePixelDimension(img.getAttribute('width')) ?? parsePixelDimension(styleProp(img, 'width'));
    const attrH = parsePixelDimension(img.getAttribute('height')) ?? parsePixelDimension(styleProp(img, 'height'));
    const ratio = natural && natural.width > 0 && natural.height > 0 ? natural.height / natural.width : undefined;

    let width: number;
    let height: number;
    if (attrW && attrH) { width = attrW; height = attrH; }
    else if (attrW) { width = attrW; height = ratio ? attrW * ratio : attrW * 0.75; }
    else if (attrH) { height = attrH; width = ratio ? attrH / ratio : attrH / 0.75; }
    else if (natural && natural.width > 0 && natural.height > 0) { width = natural.width; height = natural.height; }
    else { width = 400; height = 300; }

    if (width > MAX_IMAGE_WIDTH_PX) { height = (height * MAX_IMAGE_WIDTH_PX) / width; width = MAX_IMAGE_WIDTH_PX; }
    if (height > MAX_IMAGE_HEIGHT_PX) { width = (width * MAX_IMAGE_HEIGHT_PX) / height; height = MAX_IMAGE_HEIGHT_PX; }
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

async function fetchImageBytes(src: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
    if (typeof fetch !== 'function') return null;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), 10000) : undefined;
    try {
        const res = await fetch(src, { signal: controller?.signal });
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        return { mime: (res.headers.get('content-type') || '').toLowerCase(), bytes: new Uint8Array(buffer) };
    } catch {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** Load an <img> into embeddable data. Never throws: returns null on any failure. */
async function loadImage(img: HTMLElement): Promise<LoadedImage | null> {
    try {
        const src = (img.getAttribute('src') || '').trim();
        if (!src) return null;
        const source = src.startsWith('data:') ? parseDataUrl(src) : await fetchImageBytes(src);
        if (!source || source.bytes.length === 0) return null;

        const type = sniffImageType(source.bytes, source.mime);
        const alt = img.getAttribute('alt') || undefined;
        const title = img.getAttribute('title') || undefined;

        if (type === 'png' || type === 'jpg' || type === 'gif' || type === 'bmp') {
            const natural = readImageSize(source.bytes, type);
            const size = computeDisplaySize(img, natural);
            return { type, data: source.bytes, ...size, alt, title };
        }

        if (type === 'svg') {
            const svgSize = readSvgSize(new TextDecoder().decode(source.bytes));
            const raster = await rasterizeToPng(source.bytes, 'image/svg+xml', svgSize);
            if (!raster) return null;
            const size = computeDisplaySize(img, svgSize || raster);
            return { type: 'png', data: raster.data, svg: source.bytes, ...size, alt, title };
        }

        if (type === 'webp' || type === 'unknown') {
            const raster = await rasterizeToPng(source.bytes, source.mime || 'image/webp', null);
            if (!raster) return null;
            const size = computeDisplaySize(img, raster);
            return { type: 'png', data: raster.data, ...size, alt, title };
        }
        return null;
    } catch (e) {
        console.warn('Image could not be embedded in the DOCX, skipped:', e);
        return null;
    }
}

function makeImageRun(image: LoadedImage): ImageRun | null {
    try {
        const transformation = { width: image.width, height: image.height };
        const altText = { name: image.alt || 'image', description: image.alt, title: image.title };
        if (image.svg) {
            return new ImageRun({
                type: 'svg',
                data: image.svg,
                fallback: { type: 'png', data: image.data },
                transformation,
                altText
            });
        }
        return new ImageRun({ type: image.type, data: image.data, transformation, altText });
    } catch (e) {
        console.warn('ImageRun creation failed, image skipped:', e);
        return null;
    }
}

// ------------------------------ inline content ------------------------------

const SAFE_LINK = /^(https?:|mailto:|tel:|ftp:)/i;

/** Convert inline HTML nodes into docx paragraph children (runs, links, images, breaks). */
function parseInline(nodes: ArrayLike<Node>, ctx: BlockContext, base: RunStyle = ctx.run): ParagraphChild[] {
    const out: ParagraphChild[] = [];

    const walk = (node: Node, style: RunStyle, target: ParagraphChild[], inLink: boolean) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '').replace(/[\r\n]+/g, ' ');
            if (text.length > 0) target.push(makeTextRun(text, style));
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (SKIPPED_TAGS.has(tag)) return;

        if (tag === 'br') {
            target.push(makeTextRun('', style, { break: 1 }));
            return;
        }
        if (tag === 'img') {
            const image = ctx.images.get(el);
            const run = image ? makeImageRun(image) : null;
            if (run) target.push(run);
            return;
        }

        const childStyle = deriveRunStyle(el, tag, style);
        if (tag === 'a' && !inLink) {
            const href = (el.getAttribute('href') || '').trim();
            if (SAFE_LINK.test(href)) {
                const linkChildren: ParagraphChild[] = [];
                const linkStyle = { ...childStyle, link: true };
                for (const child of Array.from(el.childNodes)) walk(child, linkStyle, linkChildren, true);
                if (linkChildren.length > 0) {
                    target.push(new ExternalHyperlink({ link: href, children: linkChildren }));
                }
                return;
            }
        }

        // Block elements nested in inline content: keep their text on a new line.
        const isBlockish = BLOCK_TAGS.has(tag) && target.length > 0;
        if (isBlockish) target.push(makeTextRun('', style, { break: 1 }));
        for (const child of Array.from(el.childNodes)) walk(child, childStyle, target, inLink);
    };

    for (const node of Array.from(nodes)) walk(node, base, out, false);
    return out;
}

// ------------------------------ block content -------------------------------

function isMeaningfulInline(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').trim().length > 0;
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (SKIPPED_TAGS.has(tag)) return false;
    if (tag === 'br' || tag === 'img') return true;
    return (el.textContent || '').trim().length > 0 || !!el.querySelector('img, br');
}

function isBlockElement(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    if (BLOCK_TAGS.has(tag)) return true;
    // An inline wrapper (span...) that contains blocks behaves like a container.
    return !!el.querySelector(BLOCK_SELECTOR);
}

function paragraphBorder(ctx: BlockContext) {
    return ctx.quote
        ? { left: { style: BorderStyle.SINGLE, size: 12, color: 'BFBFBF', space: 8 } }
        : undefined;
}

function makeParagraph(children: ParagraphChild[], ctx: BlockContext, align?: AlignmentValue): Paragraph {
    return new Paragraph({
        children,
        alignment: align ?? ctx.align,
        indent: ctx.indent ? { left: ctx.indent } : undefined,
        border: paragraphBorder(ctx),
        spacing: { after: ctx.inTable ? 60 : 120 }
    });
}

/** Convert the child nodes of a block container, grouping loose inline content into paragraphs. */
function convertChildren(parent: Element, ctx: BlockContext): BlockChild[] {
    const out: BlockChild[] = [];
    let buffer: Node[] = [];

    const flush = () => {
        if (buffer.some(isMeaningfulInline)) {
            // Trim pure-whitespace text at the edges of the group.
            while (buffer.length && buffer[0].nodeType === Node.TEXT_NODE && !(buffer[0].textContent || '').trim()) buffer.shift();
            while (buffer.length && buffer[buffer.length - 1].nodeType === Node.TEXT_NODE && !(buffer[buffer.length - 1].textContent || '').trim()) buffer.pop();
            const children = parseInline(buffer, ctx);
            if (children.length > 0) out.push(makeParagraph(children, ctx));
        }
        buffer = [];
    };

    for (const child of Array.from(parent.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            buffer.push(child);
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (SKIPPED_TAGS.has(tag)) continue;
        if (tag === 'img' || isBlockElement(el)) {
            flush();
            out.push(...convertBlock(el, ctx));
        } else {
            buffer.push(el);
        }
    }
    flush();
    return out;
}

function convertBlock(el: HTMLElement, ctx: BlockContext): BlockChild[] {
    const tag = el.tagName.toLowerCase();
    if (SKIPPED_TAGS.has(tag)) return [];

    const heading = HEADING_LEVELS[tag];
    if (heading) {
        return [new Paragraph({
            heading: heading.level,
            alignment: getAlignment(el) ?? ctx.align,
            indent: ctx.indent ? { left: ctx.indent } : undefined,
            border: paragraphBorder(ctx),
            children: parseInline(el.childNodes, ctx),
            spacing: { before: heading.before, after: heading.after }
        })];
    }

    switch (tag) {
        case 'p':
            return [makeParagraph(parseInline(el.childNodes, ctx), ctx, getAlignment(el))];

        case 'ul':
        case 'ol':
            return convertList(el, ctx, 0);

        case 'li': {
            // Stray <li> outside of a list: render it as a bullet item.
            return convertListItem(el, ctx, 0, undefined);
        }

        case 'table':
            return convertTable(el as HTMLTableElement, ctx);

        case 'blockquote':
            return convertChildren(el, {
                ...ctx,
                indent: ctx.indent + LIST_INDENT_STEP,
                align: getAlignment(el) ?? ctx.align,
                quote: true,
                run: { ...ctx.run, italics: true }
            });

        case 'pre':
            return [convertCodeBlock(el, ctx)];

        case 'hr':
            return [new Paragraph({ thematicBreak: true, spacing: { before: 120, after: 120 } })];

        case 'br':
            return [makeParagraph([], ctx)];

        case 'img': {
            const image = ctx.images.get(el);
            const run = image ? makeImageRun(image) : null;
            if (!run) return [];
            return [new Paragraph({
                children: [run],
                alignment: getAlignment(el) ?? ctx.align ?? AlignmentType.CENTER,
                indent: ctx.indent ? { left: ctx.indent } : undefined,
                spacing: { before: 120, after: 120 }
            })];
        }

        case 'dt':
            return convertChildren(el, { ...ctx, run: { ...ctx.run, bold: true } });

        case 'dd':
            return convertChildren(el, { ...ctx, indent: ctx.indent + LIST_INDENT_STEP });

        case 'colgroup':
        case 'col':
            return [];

        default:
            // div / section / article / tableWrapper / any other container: recurse.
            return convertChildren(el, { ...ctx, align: getAlignment(el) ?? ctx.align });
    }
}

function convertCodeBlock(el: HTMLElement, ctx: BlockContext): Paragraph {
    const text = (el.textContent || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/\n$/, '');
    const style: RunStyle = { ...ctx.run, italics: false, code: false, font: CODE_FONT, size: 20 };
    const runs = text.split('\n').map((line, idx) => makeTextRun(line, style, idx > 0 ? { break: 1 } : {}));
    return new Paragraph({
        children: runs,
        indent: ctx.indent ? { left: ctx.indent } : undefined,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: CODE_SHADING },
        spacing: { before: 120, after: 120 }
    });
}

// ---------------------------------- lists -----------------------------------

const MAX_LIST_LEVEL = 8;

function orderedReference(state: NumberingState, start: number): string {
    let ref = state.references.get(start);
    if (!ref) {
        ref = `edutrack-ordered-${start}`;
        state.references.set(start, ref);
    }
    return ref;
}

function convertList(list: HTMLElement, ctx: BlockContext, level: number): BlockChild[] {
    const ordered = list.tagName.toLowerCase() === 'ol';
    let numbering: OrderedNumbering | undefined;
    if (ordered) {
        if (ctx.olNumbering) {
            // Nested ordered list: same numbering instance, deeper level (Word restarts sub-levels).
            numbering = ctx.olNumbering;
        } else {
            const start = parseInt(list.getAttribute('start') || '1', 10);
            numbering = {
                reference: orderedReference(ctx.numbering, Number.isFinite(start) && start > 0 ? start : 1),
                instance: ctx.numbering.nextInstance++
            };
        }
    }
    const lvl = Math.min(level, MAX_LIST_LEVEL);
    const itemCtx: BlockContext = { ...ctx, olNumbering: numbering ?? ctx.olNumbering };
    const out: BlockChild[] = [];

    for (const child of Array.from(list.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            const text = (child.textContent || '').trim();
            if (text) out.push(...convertListItemNodes([child], itemCtx, lvl, numbering));
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'li') out.push(...convertListItem(el, itemCtx, lvl, numbering));
        else if (tag === 'ul' || tag === 'ol') out.push(...convertList(el, itemCtx, lvl + 1));
        else out.push(...convertListItemNodes([el], itemCtx, lvl, numbering));
    }
    return out;
}

function convertListItem(li: HTMLElement, ctx: BlockContext, level: number, numbering: OrderedNumbering | undefined): BlockChild[] {
    const itemCtx = { ...ctx, align: getAlignment(li) ?? ctx.align };
    return convertListItemNodes(Array.from(li.childNodes), itemCtx, level, numbering);
}

/**
 * Render the content of a list item: the first paragraph carries the bullet/number,
 * following paragraphs are indented continuation paragraphs, nested lists go one level deeper.
 */
function convertListItemNodes(nodes: Node[], ctx: BlockContext, level: number, numbering: OrderedNumbering | undefined): BlockChild[] {
    const out: BlockChild[] = [];
    let markerUsed = false;
    let buffer: Node[] = [];
    const textIndent = ctx.indent + LIST_INDENT_STEP * (level + 1);
    const nestedCtx: BlockContext = { ...ctx, indent: textIndent };

    const emit = (children: ParagraphChild[], align?: AlignmentValue) => {
        const alignment = align ?? ctx.align;
        if (!markerUsed) {
            markerUsed = true;
            out.push(new Paragraph({
                children,
                alignment,
                ...(numbering
                    ? { numbering: { reference: numbering.reference, instance: numbering.instance, level } }
                    : { bullet: { level } }),
                indent: ctx.indent ? { left: textIndent, hanging: LIST_HANGING } : undefined,
                border: paragraphBorder(ctx),
                spacing: { after: 80 }
            }));
        } else {
            out.push(new Paragraph({
                children,
                alignment,
                indent: { left: textIndent },
                border: paragraphBorder(ctx),
                spacing: { after: 80 }
            }));
        }
    };

    const flush = () => {
        if (buffer.some(isMeaningfulInline)) {
            const children = parseInline(buffer, ctx);
            if (children.length > 0) emit(children);
        }
        buffer = [];
    };

    const visit = (list: Node[]) => {
        for (const child of list) {
            if (child.nodeType === Node.TEXT_NODE) {
                buffer.push(child);
                continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) continue;
            const el = child as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (SKIPPED_TAGS.has(tag)) continue;
            if (tag === 'p' || HEADING_LEVELS[tag]) {
                flush();
                emit(parseInline(el.childNodes, ctx), getAlignment(el));
            } else if (tag === 'ul' || tag === 'ol') {
                flush();
                out.push(...convertList(el, ctx, level + 1));
                // Text after a nested list belongs to the same item: no new marker.
                markerUsed = true;
            } else if (tag === 'div' || tag === 'section' || tag === 'article' || (tag === 'span' && isBlockElement(el))) {
                flush();
                visit(Array.from(el.childNodes));
            } else if (tag === 'img' || isBlockElement(el)) {
                flush();
                out.push(...convertBlock(el, nestedCtx));
                markerUsed = true;
            } else {
                buffer.push(el);
            }
        }
    };

    visit(nodes);
    flush();
    if (!markerUsed && out.length === 0) emit([]);
    return out;
}

// ---------------------------------- tables ----------------------------------

function tableRows(table: HTMLElement): HTMLTableRowElement[] {
    const rows: HTMLTableRowElement[] = [];
    for (const child of Array.from(table.children)) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'tr') rows.push(child as HTMLTableRowElement);
        else if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
            for (const tr of Array.from(child.children)) {
                if (tr.tagName.toLowerCase() === 'tr') rows.push(tr as HTMLTableRowElement);
            }
        }
    }
    return rows;
}

function cellElements(tr: HTMLElement): HTMLElement[] {
    return Array.from(tr.children).filter(c => {
        const t = c.tagName.toLowerCase();
        return t === 'td' || t === 'th';
    }) as HTMLElement[];
}

function spanOf(el: HTMLElement, attr: 'colspan' | 'rowspan'): number {
    const n = parseInt(el.getAttribute(attr) || '1', 10);
    return Number.isFinite(n) && n > 1 ? Math.min(n, 63) : 1;
}

function convertTable(table: HTMLTableElement, ctx: BlockContext): BlockChild[] {
    const rows = tableRows(table);
    if (rows.length === 0) return convertChildren(table, ctx);

    // Lay out the grid to know the column index of every cell (rowspan aware).
    const occupied: number[] = [];
    const layout: { cell: HTMLElement; col: number; colSpan: number; rowSpan: number }[][] = [];
    let colCount = 0;
    for (const tr of rows) {
        const placed: { cell: HTMLElement; col: number; colSpan: number; rowSpan: number }[] = [];
        let col = 0;
        for (const cell of cellElements(tr)) {
            while ((occupied[col] || 0) > 0) col++;
            const colSpan = spanOf(cell, 'colspan');
            const rowSpan = spanOf(cell, 'rowspan');
            placed.push({ cell, col, colSpan, rowSpan });
            for (let c = col; c < col + colSpan; c++) occupied[c] = Math.max(occupied[c] || 0, rowSpan);
            col += colSpan;
        }
        colCount = Math.max(colCount, col, occupied.length);
        for (let c = 0; c < occupied.length; c++) if (occupied[c] > 0) occupied[c]--;
        layout.push(placed);
    }
    colCount = Math.max(colCount, 1);

    // Column widths: <col style="width: Npx"> (TipTap colgroup) when available, otherwise equal.
    const available = Math.max(ctx.availableWidth - ctx.indent, 2000);
    const colEls = Array.from(table.querySelectorAll(':scope > colgroup > col')) as HTMLElement[];
    const pxWidths: (number | undefined)[] = Array.from({ length: colCount }, (_, i) => {
        const col = colEls[i];
        return col ? parsePixelDimension(styleProp(col, 'width')) ?? parsePixelDimension(col.getAttribute('width')) : undefined;
    });
    let widths: number[];
    const known = pxWidths.filter((w): w is number => !!w);
    if (known.length > 0) {
        const knownTotal = known.reduce((a, b) => a + b * 15, 0);
        const unknownCount = colCount - known.length;
        const rest = Math.max(available - knownTotal, unknownCount * 600);
        widths = pxWidths.map(w => (w ? w * 15 : rest / Math.max(unknownCount, 1)));
        const total = widths.reduce((a, b) => a + b, 0);
        if (total > available) widths = widths.map(w => (w * available) / total);
    } else {
        widths = Array.from({ length: colCount }, () => available / colCount);
    }
    widths = widths.map(w => Math.max(200, Math.floor(w)));

    const docxRows: TableRow[] = [];
    layout.forEach((placed, rowIdx) => {
        if (placed.length === 0) return;
        const tr = rows[rowIdx];
        const inHead = tr.parentElement?.tagName.toLowerCase() === 'thead';
        const allHeader = placed.every(p => p.cell.tagName.toLowerCase() === 'th');
        const cells = placed.map(({ cell, col, colSpan, rowSpan }) => {
            const isHeader = cell.tagName.toLowerCase() === 'th';
            const cellWidth = widths.slice(col, col + colSpan).reduce((a, b) => a + b, 0) || widths[0];
            const cellCtx: BlockContext = {
                ...ctx,
                indent: 0,
                quote: false,
                inTable: true,
                availableWidth: cellWidth,
                align: getAlignment(cell),
                olNumbering: undefined,
                run: isHeader ? { ...ctx.run, bold: true } : ctx.run
            };
            const children = convertChildren(cell, cellCtx);
            // A cell must contain (and end with) a paragraph.
            if (children.length === 0 || !(children[children.length - 1] instanceof Paragraph)) {
                children.push(new Paragraph({ children: [] }));
            }
            const bg = parseCssColor(styleProp(cell, 'background-color')) || parseCssColor(cell.getAttribute('bgcolor'));
            return new TableCell({
                children,
                width: { size: cellWidth, type: WidthType.DXA },
                columnSpan: colSpan > 1 ? colSpan : undefined,
                rowSpan: rowSpan > 1 ? rowSpan : undefined,
                shading: bg ? { type: ShadingType.CLEAR, color: 'auto', fill: bg } : undefined
            });
        });
        docxRows.push(new TableRow({
            children: cells,
            tableHeader: (inHead || (allHeader && rowIdx === 0)) || undefined
        }));
    });

    if (docxRows.length === 0) return [];

    const totalWidth = widths.reduce((a, b) => a + b, 0);
    return [
        new Table({
            rows: docxRows,
            columnWidths: widths,
            width: { size: totalWidth, type: WidthType.DXA },
            indent: ctx.indent ? { size: ctx.indent, type: WidthType.DXA } : undefined
        }),
        // Keeps consecutive tables apart and gives breathing room after the table.
        new Paragraph({ children: [], spacing: { after: 120 } })
    ];
}

// --------------------------------- entry point ------------------------------

/**
 * Convert edited HTML from TipTap into a standard .docx binary Blob.
 */
export async function convertHtmlToDocxBlob(html: string, title: string = 'Document'): Promise<Blob> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');

    // Load every image up-front (async: fetch / SVG rasterization), failures become null.
    const imgElements = Array.from(doc.body.querySelectorAll('img'));
    const loaded = await Promise.all(imgElements.map(img => loadImage(img as HTMLElement).catch(() => null)));
    const images = new Map<Element, LoadedImage | null>();
    imgElements.forEach((img, idx) => images.set(img, loaded[idx]));

    const numbering: NumberingState = { nextInstance: 1, references: new Map() };
    const ctx: BlockContext = {
        indent: 0,
        run: {},
        availableWidth: PRINTABLE_WIDTH_DXA,
        images,
        numbering
    };

    const docxChildren: BlockChild[] = convertChildren(doc.body, ctx);

    if (docxChildren.length === 0) {
        docxChildren.push(new Paragraph({ text: '' }));
    }

    const numberingConfig = Array.from(numbering.references.entries()).map(([start, reference]) => ({
        reference,
        levels: Array.from({ length: MAX_LIST_LEVEL + 1 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            start,
            alignment: AlignmentType.LEFT,
            style: {
                paragraph: {
                    indent: { left: LIST_INDENT_STEP * (level + 1), hanging: LIST_HANGING }
                }
            }
        }))
    }));

    const docx = new Document({
        creator: 'EduTrack',
        title: title,
        description: 'Document édité au sein d’EduTrack',
        styles: {
            default: {
                document: { run: { font: 'Calibri', size: 24 } },
                heading1: { run: { font: 'Calibri', size: 36, bold: true } },
                heading2: { run: { font: 'Calibri', size: 30, bold: true } },
                heading3: { run: { font: 'Calibri', size: 26, bold: true } },
                heading4: { run: { font: 'Calibri', size: 24, bold: true } },
                heading5: { run: { font: 'Calibri', size: 24, bold: true, italics: true } },
                heading6: { run: { font: 'Calibri', size: 22, italics: true } }
            }
        },
        numbering: { config: numberingConfig },
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

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

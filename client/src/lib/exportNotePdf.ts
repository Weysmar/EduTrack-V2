import html2pdf from 'html2pdf.js'
import { renderMathInHtml } from '@/lib/renderMath'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export interface NotePdfOptions {
    title: string
    content: string
    courseTitle?: string
    courseCode?: string
    updatedAt?: string | Date
    language?: string
}

/**
 * Generates a High-Definition, publication-ready A4 PDF for EduTrack notes.
 * Preprocesses KaTeX mathematical formulas, local typography, tables, and images
 * with high DPI rendering and page-break optimization.
 */
export async function exportNoteToPdf({
    title,
    content,
    courseTitle,
    courseCode,
    updatedAt,
    language = 'fr'
}: NotePdfOptions): Promise<void> {
    const locale = language === 'fr' ? fr : enUS
    const now = new Date()
    const generatedDateStr = format(now, "d MMMM yyyy 'à' HH:mm", { locale })
    const updatedDateStr = updatedAt
        ? format(new Date(updatedAt), "d MMMM yyyy", { locale })
        : null

    // 1. Process KaTeX math equations in the note content
    const processedHtml = renderMathInHtml(content || '<p><i>Aucun contenu</i></p>')

    // 2. Build High-Definition Print Template
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '794px' // Approx A4 width at 96 DPI
    container.style.backgroundColor = '#ffffff'
    container.style.color = '#0f172a'
    container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif"
    container.style.padding = '36px 44px'
    container.style.boxSizing = 'border-box'

    // Clean, sanitized filename
    const safeTitle = (title || 'Note').replace(/[/\\?%*:|"<>]/g, '-').trim()
    const fileName = `${safeTitle}.pdf`

    container.innerHTML = `
        <style>
            .edutrack-pdf-root {
                font-size: 13.5px;
                line-height: 1.65;
                color: #1e293b;
            }
            .edutrack-pdf-header {
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 18px;
                margin-bottom: 24px;
            }
            .edutrack-pdf-badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 9999px;
                background-color: #eff6ff;
                color: #2563eb;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 8px;
                border: 1px solid #dbeafe;
            }
            .edutrack-pdf-title {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 10px 0;
                line-height: 1.25;
            }
            .edutrack-pdf-meta {
                font-size: 11px;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .edutrack-pdf-content h1 {
                font-size: 20px;
                font-weight: 700;
                color: #0f172a;
                margin-top: 24px;
                margin-bottom: 10px;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 4px;
                page-break-after: avoid;
            }
            .edutrack-pdf-content h2 {
                font-size: 16.5px;
                font-weight: 700;
                color: #1e293b;
                margin-top: 18px;
                margin-bottom: 8px;
                page-break-after: avoid;
            }
            .edutrack-pdf-content h3 {
                font-size: 14.5px;
                font-weight: 600;
                color: #334155;
                margin-top: 14px;
                margin-bottom: 6px;
                page-break-after: avoid;
            }
            .edutrack-pdf-content p {
                margin: 0.6em 0;
            }
            .edutrack-pdf-content ul {
                list-style-type: disc;
                padding-left: 24px;
                margin: 0.6em 0;
            }
            .edutrack-pdf-content ol {
                list-style-type: decimal;
                padding-left: 24px;
                margin: 0.6em 0;
            }
            .edutrack-pdf-content li {
                margin: 0.25em 0;
            }
            .edutrack-pdf-content blockquote {
                border-left: 4px solid #3b82f6;
                background-color: #f8fafc;
                padding: 8px 16px;
                margin: 14px 0;
                color: #334155;
                font-style: italic;
                border-radius: 0 8px 8px 0;
                page-break-inside: avoid;
            }
            .edutrack-pdf-content pre {
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px;
                font-family: 'JetBrains Mono', Consolas, monospace;
                font-size: 11.5px;
                line-height: 1.5;
                overflow-x: auto;
                page-break-inside: avoid;
            }
            .edutrack-pdf-content code {
                background-color: #f1f5f9;
                padding: 2px 5px;
                border-radius: 4px;
                font-family: 'JetBrains Mono', Consolas, monospace;
                font-size: 0.9em;
                color: #0f172a;
            }
            .edutrack-pdf-content pre code {
                background-color: transparent;
                padding: 0;
            }
            .edutrack-pdf-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 12px;
                page-break-inside: avoid;
                border: 1px solid #cbd5e1;
            }
            .edutrack-pdf-content th,
            .edutrack-pdf-content td {
                border: 1px solid #cbd5e1;
                padding: 7px 10px;
                text-align: left;
                vertical-align: top;
            }
            .edutrack-pdf-content th {
                background-color: #f8fafc;
                font-weight: 700;
                color: #0f172a;
            }
            .edutrack-pdf-content img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                margin: 14px auto;
                display: block;
                page-break-inside: avoid;
            }
            .edutrack-pdf-content hr {
                border: none;
                border-top: 1px solid #e2e8f0;
                margin: 20px 0;
            }
            .katex-display-wrapper {
                text-align: center;
                margin: 14px 0;
                page-break-inside: avoid;
            }
            .katex {
                font-size: 1.1em;
                color: #0f172a !important;
            }
            .edutrack-pdf-footer {
                margin-top: 36px;
                padding-top: 14px;
                border-top: 1px solid #e2e8f0;
                font-size: 10.5px;
                color: #94a3b8;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
        </style>

        <div class="edutrack-pdf-root">
            <div class="edutrack-pdf-header">
                ${courseTitle ? `<div class="edutrack-pdf-badge">${courseCode ? `${courseCode} • ` : ''}${courseTitle}</div>` : ''}
                <h1 class="edutrack-pdf-title">${title || (language === 'fr' ? 'Note de cours' : 'Course note')}</h1>
                <div class="edutrack-pdf-meta">
                    <span>📅 ${language === 'fr' ? 'Généré le' : 'Generated on'} ${generatedDateStr}</span>
                    ${updatedDateStr ? `<span>✏️ ${language === 'fr' ? 'Mis à jour le' : 'Updated on'} ${updatedDateStr}</span>` : ''}
                </div>
            </div>

            <div class="edutrack-pdf-content">
                ${processedHtml}
            </div>

            <div class="edutrack-pdf-footer">
                <span>EduTrack • ${courseTitle || 'Notes académiques'}</span>
                <span>Document haute définition</span>
            </div>
        </div>
    `

    document.body.appendChild(container)

    try {
        const opt = {
            margin: [10, 10, 12, 10] as [number, number, number, number], // top, left, bottom, right in mm
            filename: fileName,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2.5, // Crisp HD rendering
                useCORS: true,
                letterRendering: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait' as const,
                compress: true
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                avoid: ['table', 'tr', 'pre', 'blockquote', '.katex-display-wrapper', 'img', 'h1', 'h2', 'h3']
            }
        }

        await html2pdf().from(container).set(opt).save()
    } finally {
        document.body.removeChild(container)
    }
}

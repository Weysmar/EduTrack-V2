import { useRef, useState } from 'react'
import { SummaryResult } from '@/lib/summary/types'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { useLanguage } from '@/components/language-provider'

interface UseSummaryExportReturn {
    isExporting: boolean
    handleExportPDF: () => Promise<void>
    handleExportDOCX: () => Promise<void>
    contentRef: React.RefObject<HTMLDivElement>
}

export function useSummaryExport(summary: SummaryResult | null, title: string = "Document"): UseSummaryExportReturn {
    const [isExporting, setIsExporting] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)
    const { t } = useLanguage()

    const handleExportPDF = async () => {
        if (!summary || !contentRef.current) return

        setIsExporting(true)
        try {
            // Clone the element to avoid modifying the visible DOM
            const element = contentRef.current.cloneNode(true) as HTMLElement

            // Apply PDF-specific styles to the clone
            // Force white background and black text
            element.style.backgroundColor = '#FFFFFF'
            element.style.color = '#000000'
            element.style.padding = '40px'
            element.style.position = 'absolute'
            element.style.left = '-9999px'
            element.style.top = '0'
            element.style.width = '210mm' // A4 width

            // Force text color on all children
            const allElements = element.getElementsByTagName('*')
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement
                el.style.color = '#000000'
                if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
                    el.style.color = '#0000FF'
                }
            }

            document.body.appendChild(element)

            // Wait a tick for the DOM to update
            await new Promise(resolve => setTimeout(resolve, 100))

            const opt: any = {
                margin: 10, // simplified margin
                filename: `${title.replace(/[^a-z0-9]/yi, '_')}_summary.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }

            await html2pdf().set(opt).from(element).save()

            document.body.removeChild(element)
        } catch (error) {
            console.error('PDF Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportDOCX = async () => {
        if (!summary) return

        setIsExporting(true)
        try {
            const doc = new Document({
                styles: {
                    default: {
                        document: {
                            run: {
                                font: "Arial",
                            },
                        },
                    },
                },
                sections: [{
                    children: [
                        new Paragraph({
                            text: `${t('export.defaultTitle')}: ${title}`,
                            heading: HeadingLevel.TITLE,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 },
                            run: {
                                font: "Arial",
                                color: "2563EB", // Blue-600
                                bold: true,
                            }
                        }),
                        new Paragraph({
                            text: `${t('export.generatedOn')} ${new Date().toLocaleDateString()}`,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 500 },
                            run: {
                                font: "Arial",
                                italics: true,
                                color: "64748B", // Slate-500
                            }
                        }),
                        ...processMarkdownToDocx(summary.content)
                    ],
                }],
            })

            const blob = await Packer.toBlob(doc)
            saveAs(blob, `${title.replace(/[^a-z0-9]/yi, '_')}_summary.docx`)
        } catch (error) {
            console.error('DOCX Export failed:', error)
        } finally {
            setIsExporting(false)
        }
    }

    // Helper to convert simple markdown to Docx paragraphs
    const processMarkdownToDocx = (text: string): Paragraph[] => {
        const lines = text.split('\n')
        return lines.map(line => {
            const trimmed = line.trim()
            if (line.startsWith('# ')) {
                return new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                    run: { font: "Arial", color: "2563EB", bold: true }
                })
            } else if (line.startsWith('## ')) {
                return new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                    run: { font: "Arial", color: "3B82F6", bold: true }
                })
            } else if (line.startsWith('### ')) {
                return new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                    run: { font: "Arial", color: "60A5FA", bold: true }
                })
            } else if (trimmed.startsWith('- ')) {
                return new Paragraph({
                    children: processTextRuns(trimmed.replace('- ', '')),
                    bullet: { level: 0 },
                    run: { font: "Arial", size: 24 } // 24 = 12pt
                })
            } else if (trimmed.length > 0) {
                return new Paragraph({
                    children: processTextRuns(trimmed),
                    spacing: { after: 120 },
                    run: { font: "Arial", size: 24 }
                })
            }
            return new Paragraph({ text: "" })
        })
    }

    const processTextRuns = (text: string): TextRun[] => {
        // Simple bold parsing (**text**)
        const parts = text.split(/(\*\*.*?\*\*)/g)
        return parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({
                    text: part.slice(2, -2),
                    bold: true,
                    font: "Arial",
                    size: 24
                })
            }
            return new TextRun({
                text: part,
                font: "Arial",
                size: 24
            })
        })
    }

    return {
        isExporting,
        handleExportPDF,
        handleExportDOCX,
        contentRef
    }
}


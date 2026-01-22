import { SummaryResult } from '@/lib/summary/types'
import { Download, FileText, Copy, Check, ArrowLeft } from 'lucide-react'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import html2pdf from 'html2pdf.js'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

interface SummaryResultModalProps {
    summary: SummaryResult | null
    isOpen: boolean
    onClose: () => void
}

export function SummaryResultModal({ summary, isOpen, onClose }: SummaryResultModalProps) {
    // const { t } = useLanguage()
    const [copied, setCopied] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const contentRef = useRef<HTMLDivElement>(null)

    if (!isOpen || !summary) return null

    const handleCopy = () => {
        const text = typeof summary.content === 'string' ? summary.content : JSON.stringify(summary.content)
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleExportPDF = async () => {
        if (!contentRef.current) return
        setIsExporting(true)

        const options: any = {
            margin: [10, 10, 10, 10],
            filename: `resume_${summary.itemId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }

        try {
            // Clone the element to ensure we capture everything without scroll issues
            // We place it at top-left but behind everything (z-index -1000) to ensure html2canvas sees it as "on screen"
            const element = contentRef.current
            const clone = element.cloneNode(true) as HTMLElement

            // Reset styles on clone to ensure full height capture and proper rendering context
            clone.style.height = 'auto'
            clone.style.width = '800px' // Fix width for A4 consistency
            clone.style.maxWidth = 'none'
            clone.style.overflow = 'visible'
            clone.style.position = 'fixed' // Fixed to viewport
            clone.style.top = '0'
            clone.style.left = '0'
            clone.style.zIndex = '-1000'
            clone.style.background = 'white'
            clone.style.color = 'black' // Ensure text is visible 

            // We need to append to body to be rendered
            document.body.appendChild(clone)

            await html2pdf().set(options).from(clone).save()
            document.body.removeChild(clone)
        } catch (e) {
            console.error("PDF Export failed", e)
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportDOCX = async () => {
        try {
            setIsExporting(true)
            const textContent = typeof summary.content === 'string' ? summary.content : "Contenu complexe"

            // Simple parser: converting markdown to Docx paragraphs
            // This is a naive implementation. For robust MD->Docx, a library is better, but 'docx' lib requires building the tree manually.
            // Improved Parser for DOCX
            const processTextRuns = (text: string): TextRun[] => {
                const runs: TextRun[] = []
                let currentText = text

                // Regex for **bold**
                const boldRegex = /\*\*(.*?)\*\*/g
                let match
                let lastIndex = 0

                while ((match = boldRegex.exec(currentText)) !== null) {
                    // Add text before bold
                    if (match.index > lastIndex) {
                        runs.push(new TextRun({ text: currentText.substring(lastIndex, match.index), size: 24 }))
                    }
                    // Add bold text
                    runs.push(new TextRun({ text: match[1], bold: true, size: 24 }))
                    lastIndex = boldRegex.lastIndex
                }
                // Add remaining text
                if (lastIndex < currentText.length) {
                    runs.push(new TextRun({ text: currentText.substring(lastIndex), size: 24 }))
                }

                return runs.length > 0 ? runs : [new TextRun({ text: currentText, size: 24 })]
            }

            const paragraphs = textContent.split('\n').map(line => {
                const trimmed = line.trim()
                if (!trimmed) return new Paragraph({ text: "" })

                if (trimmed.startsWith('# ')) {
                    return new Paragraph({
                        text: trimmed.replace('# ', ''),
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 240, before: 240 }
                    })
                }
                if (trimmed.startsWith('## ')) {
                    return new Paragraph({
                        text: trimmed.replace('## ', ''),
                        heading: HeadingLevel.HEADING_2,
                        spacing: { after: 200, before: 200 }
                    })
                }
                if (trimmed.startsWith('### ')) {
                    return new Paragraph({
                        text: trimmed.replace('### ', ''),
                        heading: HeadingLevel.HEADING_3,
                        spacing: { after: 160, before: 160 }
                    })
                }
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const cleanText = trimmed.replace(/^[-*] /, '')
                    return new Paragraph({
                        children: processTextRuns(cleanText),
                        bullet: { level: 0 },
                        spacing: { after: 80 }
                    })
                }
                // Handle sub-bullets (indentation)
                if (trimmed.startsWith('  - ') || trimmed.startsWith('  * ') || trimmed.startsWith('\t- ')) {
                    const cleanText = trimmed.replace(/^\s+[-*] /, '')
                    return new Paragraph({
                        children: processTextRuns(cleanText),
                        bullet: { level: 1 },
                        spacing: { after: 60 }
                    })
                }

                // LaTeX Block handling (naive)
                if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
                    return new Paragraph({
                        children: [new TextRun({ text: trimmed.replace(/\$\$/g, ''), italics: true, color: "555555", size: 22 })],
                        alignment: "center",
                        spacing: { after: 120, before: 120 },
                        border: {
                            bottom: { color: "auto", space: 1, style: "single", size: 6 },
                            top: { color: "auto", space: 1, style: "single", size: 6 },
                            left: { color: "auto", space: 1, style: "single", size: 6 },
                            right: { color: "auto", space: 1, style: "single", size: 6 },
                        }
                    })
                }

                return new Paragraph({
                    children: processTextRuns(trimmed),
                    spacing: { after: 120 }
                })
            })

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Résumé Détailé",
                                    bold: true,
                                    size: 32, // 16pt
                                    color: "2E7D32" // Greenish title
                                }),
                            ],
                            spacing: { after: 400 }
                        }),
                        ...paragraphs,
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Généré le: ${new Date(summary.createdAt).toLocaleString()}`,
                                    italics: true,
                                    size: 16,
                                    color: "888888"
                                })
                            ],
                            spacing: { before: 800 }
                        })
                    ],
                }],
            })

            const blob = await Packer.toBlob(doc)
            saveAs(blob, `resume_${summary.itemId}.docx`)
        } catch (e) {
            console.error("DOCX Export failed", e)
        } finally {
            setIsExporting(false)
        }
    }

    // Full screen overlay with sidebar spacing
    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in slide-in-from-right-10 duration-200 safe-left safe-right">
            {/* Header Toolbar */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-card/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium hidden sm:inline">Retour</span>
                    </button>
                    <div className="h-6 w-px bg-border hidden sm:block" />
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Résumé
                    </h2>
                    <div className="hidden md:flex items-center gap-2 text-xs">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {summary.options.compression * 100}%
                        </span>
                        <span className="text-muted-foreground">
                            {summary.stats.summaryWordCount} mots
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 hover:bg-muted rounded-md border flex items-center gap-2 text-sm transition-colors"
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        <span className="hidden sm:inline">{copied ? "Copié" : "Copier"}</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md flex items-center gap-2 text-sm transition-colors"
                    >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                        onClick={handleExportDOCX}
                        disabled={isExporting}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-md flex items-center gap-2 text-sm transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">DOCX</span>
                    </button>
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto bg-muted/5 p-4 md:p-8 flex justify-center">
                <div className="w-full max-w-4xl bg-card shadow-sm border rounded-xl min-h-full p-8 md:p-12 mb-20">
                    {/* We use a ref here for html2pdf to grab just this content */}
                    <div ref={contentRef} className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-lg prose-li:text-lg leading-relaxed text-foreground/90">
                        {/* React Markdown for proper formatting */}
                        {typeof summary.content === 'string' ? (
                            <ReactMarkdown
                                components={{
                                    // Custom components if needed, e.g. for code blocks
                                }}
                            >
                                {summary.content}
                            </ReactMarkdown>
                        ) : (
                            <p>Contenu non supporté</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useState } from 'react'
import html2pdf from 'html2pdf.js'
import { ExportConfig } from '@/components/ExportConfigModal'

export function usePdfExport() {
    const [isExporting, setIsExporting] = useState(false)

    const generatePdf = async (itemsToExport: any[], config: ExportConfig) => {
        setIsExporting(true)

        try {
            // calculated date
            const dateStr = new Date().toLocaleDateString()

            // Create a temporary container for the PDF content
            const container = document.createElement('div')
            container.style.position = 'absolute'
            container.style.left = '-9999px'
            container.style.top = '0'
            container.style.width = '800px' // A4 approx width in px at 96dpi ? better use mm settings in html2pdf
            container.className = 'pdf-export-container font-sans text-foreground bg-background p-8'

            // Build Content
            let htmlContent = `
                <div class="pdf-header mb-8 border-b pb-4">
                    <h1 class="text-4xl font-bold text-primary mb-2">${config.fileName}</h1>
                    <p class="text-sm text-muted-foreground">Generated on ${dateStr}</p>
                </div>
            `

            // Stats Section
            if (config.includeStats) {
                htmlContent += `
                    <div class="pdf-stats mb-8 p-4 bg-muted/20 rounded-lg border">
                        <h2 class="text-lg font-semibold mb-2">Statistics</h2>
                         <div class="grid grid-cols-3 gap-4">
                            <div>Total Items: ${itemsToExport.length}</div>
                         </div>
                    </div>
                 `
            }

            // TOC
            if (config.includeTableOfContents) {
                htmlContent += `
                    <div class="pdf-toc mb-8">
                        <h2 class="text-2xl font-bold mb-4">Table of Contents</h2>
                        <ul class="list-disc pl-5 space-y-1">
                            ${itemsToExport.map(item => `<li>${item.title || item.name}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="html2pdf__page-break"></div>
                 `
            }

            // Content Loop
            for (const item of itemsToExport) {
                // Determine styling based on type
                let itemHtml = ''

                if (item.type === 'note' || item.type === 'exercise') {
                    itemHtml = `
                        <div class="pdf-item mb-8 break-inside-avoid">
                            <div class="mb-4 pb-2 border-b border-muted flex items-center justify-between">
                                <h2 class="text-2xl font-bold">${item.title}</h2>
                                <span class="text-xs px-2 py-1 rounded-full bg-muted uppercase">${item.type}</span>
                            </div>
                            <div class="prose prose-sm max-w-none">
                                ${item.content || item.description || '<i>No content</i>'}
                            </div>
                        </div>
                     `
                } else if (item.title) {
                    // Course as header
                    itemHtml = `
                        <div class="pdf-course-header mb-8 mt-12 bg-primary/5 p-6 rounded-xl text-center">
                            <h1 class="text-3xl font-bold text-primary">${item.title}</h1>
                            <p class="text-lg text-muted-foreground">${item.description || ''}</p>
                        </div>
                        <div class="html2pdf__page-break"></div>
                     `
                }

                htmlContent += itemHtml
            }

            container.innerHTML = htmlContent
            document.body.appendChild(container)

            const opt = {
                margin: 10,
                filename: `${config.fileName}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };

            await html2pdf().from(container).set(opt).save()

            // Cleanup
            document.body.removeChild(container)

        } catch (error) {
            console.error("Export failed", error)
        } finally {
            setIsExporting(false)
        }
    }

    const exportCourse = async (courseId: string, config: ExportConfig) => {
        const { courseQueries, itemQueries } = await import('@/lib/api/queries')
        const course = await courseQueries.getOne(courseId)
        if (!course) return

        const items = await itemQueries.getByCourse(courseId)

        // Structure data: Course -> Items
        const exportData = [course, ...items]

        await generatePdf(exportData, config)
    }

    return {
        isExporting,
        exportCourse
    }
}

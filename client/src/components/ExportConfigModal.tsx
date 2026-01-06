import { useState } from 'react'
import { X, FileDown, Loader2 } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

interface ExportConfigModalProps {
    isOpen: boolean
    onClose: () => void
    onExport: (config: ExportConfig) => Promise<void>
    defaultFileName?: string
    isProcessing?: boolean
}

export interface ExportConfig {
    fileName: string
    includeTableOfContents: boolean
    includeStats: boolean
    includeImages: boolean
}

export function ExportConfigModal({ isOpen, onClose, onExport, defaultFileName, isProcessing }: ExportConfigModalProps) {
    const { t } = useLanguage()
    const [fileName, setFileName] = useState(defaultFileName || `Export_${new Date().toISOString().split('T')[0]}`)
    const [includeTableOfContents, setIncludeTableOfContents] = useState(true)
    const [includeStats, setIncludeStats] = useState(true)
    const [includeImages, setIncludeImages] = useState(true)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onExport({
            fileName,
            includeTableOfContents,
            includeStats,
            includeImages
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FileDown className="h-5 w-5" />
                        {t('export.title') || 'Export PDF'}
                    </h2>
                    <button onClick={onClose} disabled={isProcessing} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">File Name</label>
                        <input
                            value={fileName}
                            onChange={e => setFileName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-xs">Options</h3>

                        <label className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                            <span className="text-sm">Include Table of Contents</span>
                            <input
                                type="checkbox"
                                checked={includeTableOfContents}
                                onChange={e => setIncludeTableOfContents(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                            <span className="text-sm">Include Statistics</span>
                            <input
                                type="checkbox"
                                checked={includeStats}
                                onChange={e => setIncludeStats(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                            <span className="text-sm">Include Images</span>
                            <input
                                type="checkbox"
                                checked={includeImages}
                                onChange={e => setIncludeImages(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    Export PDF
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

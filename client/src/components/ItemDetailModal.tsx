import { Item } from '@/lib/types';
import { X, Dumbbell, FileText, FolderOpen, Download, Calendar, Trash2, MonitorPlay, Eye, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useState } from 'react'
import { useSummary } from '@/hooks/useSummary'
import { SummaryPanel } from './SummaryPanel'
import { SummaryOptionsModal } from './SummaryOptionsModal'
import { extractText } from '@/lib/extractText'
import { SummaryResultModal } from './SummaryResultModal'
import { SummaryOptions, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { FilePreviewModal } from './FilePreviewModal'

interface ItemDetailModalProps {
    item: Item | null
    onClose: () => void
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
    const { t } = useLanguage()
    const [isSummaryOptionsOpen, setIsSummaryOptionsOpen] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [extractionError, setExtractionError] = useState<string | null>(null)
    const [showSummaryModal, setShowSummaryModal] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    // Use Summary Hook
    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating, error: summaryError } = useSummary(item?.id || 0, item?.type || 'note')

    if (!item) return null

    const handleDownload = () => {
        if (item.fileData && item.fileName) {
            const url = URL.createObjectURL(item.fileData)
            const a = document.createElement('a')
            a.href = url
            a.download = item.fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }
    }

    const handleDelete = async () => {
        if (confirm(t('item.delete.confirm'))) {
            if (item.id) {
                const { itemQueries } = await import('@/lib/api/queries')
                await itemQueries.delete(String(item.id))
                // Summary deletion handled by backend cascade hopefully
                onClose()
            }
        }
    }

    const handleGenerateSummary = async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS) => {
        setExtractionError(null)
        try {
            let textContent = item.content || ''

            // If Resource (PDF/Image), check for extracted content or extract now
            if (item.type === 'resource' && item.fileData) {
                if (item.extractedContent) {
                    textContent = item.extractedContent
                } else {
                    setIsExtracting(true)
                    setShowSummary(true)
                    try {
                        // Convert Blob to File
                        const file = new File([item.fileData], item.fileName || 'file', { type: item.fileType })
                        textContent = await extractText(file)

                        // Cache the extracted text
                        if (item.id) {
                            const { itemQueries } = await import('@/lib/api/queries')
                            await itemQueries.update(String(item.id), { extractedContent: textContent })
                        }
                    } catch (extractionErr: any) {
                        setExtractionError(extractionErr.message || "Failed to extract text")
                        setIsExtracting(false)
                        return // Stop here
                    }
                    setIsExtracting(false)
                }
            }

            setShowSummary(true) // Show immediately
            await generateSummary(options, textContent)
        } catch (e: any) {
            console.error(e)
            setIsExtracting(false)
            setExtractionError(e.message || t('summary.error.noContent'))
        }
    }

    return (
        <>
            <SummaryResultModal
                summary={summary}
                isOpen={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
            />

            <FilePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                fileData={item.fileData || null}
                fileName={item.fileName || 'File'}
                fileType={item.fileType || ''}
            />

            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-3xl bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-md",
                                item.type === 'exercise' && "bg-blue-100 text-blue-600 dark:bg-blue-900/20",
                                item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20",
                                item.type === 'resource' && (item.fileName && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(item.fileName.split('.').pop()?.toLowerCase() || '') ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" : "bg-green-100 text-green-600 dark:bg-green-900/20"),
                            )}>
                                {item.type === 'exercise' && <Dumbbell className="h-5 w-5" />}
                                {item.type === 'note' && <FileText className="h-5 w-5" />}
                                {item.type === 'resource' && (item.fileName && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(item.fileName.split('.').pop()?.toLowerCase() || '') ? <ImageIcon className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{item.title}</h2>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {item.createdAt?.toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (summary) setShowSummary(!showSummary)
                                    else setIsSummaryOptionsOpen(true)
                                }}
                                className={cn("flex items-center gap-2 px-3 py-2 rounded-md transition-all border",
                                    showSummary
                                        ? 'bg-primary/10 text-primary border-primary/20'
                                        : 'text-muted-foreground hover:bg-muted border-transparent'
                                )}
                                title="Summarize"
                            >
                                {isSummaryGenerating || isExtracting ? (
                                    <MonitorPlay className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileText className="h-4 w-4" />
                                )}
                                <span className="text-xs font-semibold hidden md:inline">
                                    {summary ? (showSummary ? t('summary.hide') : t('summary.view')) : t('summary.trigger')}
                                </span>
                            </button>

                            <button
                                onClick={handleDelete}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title={t('action.delete')}
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto flex flex-col md:flex-row">
                        {/* Main Content */}
                        <div className={cn("p-6 space-y-6 flex-1", showSummary ? "border-r md:w-3/5" : "w-full")}>
                            {/* Status & Difficulty Badges for Exercises */}
                            {item.type === 'exercise' && item.status && item.difficulty && (
                                <div className="flex gap-2">
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                        item.difficulty === 'easy' ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                                            item.difficulty === 'medium' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" :
                                                "bg-red-100 text-red-700 dark:bg-red-900/30"
                                    )}>
                                        {t(`diff.${item.difficulty}`)}
                                    </span>
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                        item.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                                            item.status === 'in-progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                                                "bg-muted text-muted-foreground"
                                    )}>
                                        {t(`status.${item.status.replace('-', '')}`)}
                                    </span>
                                </div>
                            )}

                            {/* Content / Description */}
                            {item.content && (
                                <div className="prose dark:prose-invert max-w-none">
                                    {item.type === 'note' ? (
                                        <div dangerouslySetInnerHTML={{ __html: item.content }} />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{item.content}</p>
                                    )}
                                </div>
                            )}

                            {/* Attached File */}
                            {(item.fileData || item.type === 'resource') && (
                                <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-between group hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-background rounded-md border">
                                            <FolderOpen className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{item.fileName || "Attached File"}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => setIsPreviewOpen(true)}
                                            className="p-2 hover:bg-background rounded-md border border-transparent hover:border-border transition-all mr-2"
                                            title="Preview"
                                        >
                                            <Eye className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className="p-2 hover:bg-background rounded-md border border-transparent hover:border-border transition-all"
                                            title="Download"
                                        >
                                            <Download className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary Panel (Side-by-side or collapsible) */}
                        {showSummary && (summary || isSummaryGenerating || isExtracting) && (
                            <div className="w-full md:w-2/5 border-t md:border-t-0 bg-muted/5">
                                <SummaryPanel
                                    summary={summary}
                                    isLoading={isSummaryGenerating}
                                    onRegenerate={() => setIsSummaryOptionsOpen(true)}
                                    onConfigure={() => setIsSummaryOptionsOpen(true)}
                                    onMaximize={() => setShowSummaryModal(true)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <SummaryOptionsModal
                    isOpen={isSummaryOptionsOpen}
                    onClose={() => setIsSummaryOptionsOpen(false)}
                    onGenerate={handleGenerateSummary}
                    initialOptions={summary?.options}
                />
            </div>
        </>
    )
}

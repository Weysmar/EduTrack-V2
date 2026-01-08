import { Trash2, X, CheckSquare, Loader2 } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { createPortal } from 'react-dom'

interface BulkActionBarProps {
    selectedCount: number
    onClearSelection: () => void
    onDelete: () => void
    isDeleting?: boolean
}

export function BulkActionBar({ selectedCount, onClearSelection, onDelete, isDeleting = false }: BulkActionBarProps) {
    const { t } = useLanguage()

    if (selectedCount === 0) return null

    return createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-8 duration-200">
            <div className="flex items-center gap-3 border-r border-background/20 pr-4">
                <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                    {selectedCount}
                </div>
                <span className="font-medium text-sm whitespace-nowrap">
                    {selectedCount > 1 ? t('bulk.selected_plural') : t('bulk.selected_singular')}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors text-sm font-medium"
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {t('common.delete')}
                </button>

                <button
                    onClick={onClearSelection}
                    className="p-1.5 hover:bg-background/20 rounded-full transition-colors ml-1"
                    title={t('common.cancel')}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>,
        document.body
    )
}

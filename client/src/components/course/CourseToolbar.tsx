import { cn } from '@/lib/utils'
import { LayoutGrid, List, CheckSquare, Image as ImageIcon } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { SortOption } from '@/hooks/useCourseFilters'

interface CourseToolbarProps {
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    showThumbnails: boolean;
    onToggleThumbnails: () => void;
    gridColumns: number;
    onGridColumnsChange: (cols: number) => void;
    currentCount: number;
    selectedCount: number;
    onSelectAll: () => void;
}

export function CourseToolbar({
    sortOption,
    onSortChange,
    viewMode,
    onViewModeChange,
    showThumbnails,
    onToggleThumbnails,
    gridColumns,
    onGridColumnsChange,
    currentCount,
    selectedCount,
    onSelectAll
}: CourseToolbarProps) {
    const { t } = useLanguage()

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 bg-muted/20 border rounded-xl">
            {/* Left: Sorting & Global Selection */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground whitespace-nowrap">
                        {t('sort.label') || 'TRIER PAR'}:
                    </span>
                    <select
                        value={sortOption}
                        onChange={(e) => onSortChange(e.target.value as SortOption)}
                        className="bg-transparent text-xs sm:text-sm font-medium border-none focus:ring-0 cursor-pointer text-foreground p-0 [&>option]:bg-background [&>option]:text-foreground"
                    >
                        <option value="date">{t('sort.dateAdded') || 'Date'}</option>
                        <option value="alpha">{t('sort.alphabetical') || 'Nom'}</option>
                        <option value="last_opened">{t('sort.lastOpened') || 'Dernier accès'}</option>
                    </select>
                </div>
                <div className="h-4 w-px bg-border hidden sm:block"></div>
                <button
                    onClick={onSelectAll}
                    className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <div className={cn("w-4 h-4 border rounded flex items-center justify-center transition-colors",
                        selectedCount > 0 && selectedCount === currentCount ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                    )}>
                        {selectedCount > 0 && selectedCount === currentCount && <CheckSquare className="h-3 w-3" />}
                    </div>
                    {t('action.selectAll') || 'Tout sélectionner'}
                </button>
            </div>

            {/* Right: View Toggles */}
            <div className="flex items-center gap-2">
                {viewMode === 'grid' && (
                    <div className="flex items-center gap-2 mr-2">
                        <button
                            onClick={onToggleThumbnails}
                            className={cn("p-1.5 rounded transition-all mr-2", showThumbnails ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-muted-foreground hover:bg-muted")}
                            title={showThumbnails ? t('view.thumbnails_on') : t('view.thumbnails_off')}
                        >
                            <ImageIcon className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-muted-foreground">{t('grid.columns') || 'Cols'}:</span>
                        <select
                            value={gridColumns}
                            onChange={(e) => onGridColumnsChange(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer text-foreground p-0 [&>option]:bg-background [&>option]:text-foreground"
                        >
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                            <option value={6}>6</option>
                            <option value={10}>10</option>
                        </select>
                    </div>
                )}
                <div className="flex items-center bg-background border rounded-md p-1">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={cn("p-1.5 rounded transition-all", viewMode === 'grid' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                        title={t('view.grid') || 'Grille'}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                        title={t('view.list') || 'Liste'}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

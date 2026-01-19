import { cn } from '@/lib/utils'
import { FolderOpen, Dumbbell, FileText, Layers, CheckSquare, Brain } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { FilterTab } from '@/hooks/useCourseFilters'

interface CourseFiltersProps {
    activeFilters: FilterTab[];
    onToggle: (tab: FilterTab) => void;
}

export function CourseFilters({ activeFilters, onToggle }: CourseFiltersProps) {
    const { t } = useLanguage()

    const filters = [
        { id: 'all', label: t('filter.all') || 'Tout' },
        { id: 'resource', label: t('filter.resources') || 'Ressources', icon: FolderOpen },
        { id: 'exercise', label: t('filter.exercises') || 'Exercices', icon: Dumbbell },
        { id: 'note', label: t('filter.notes') || 'Notes', icon: FileText },
        { id: 'flashcards', label: t('filter.flashcards') || 'Flashcards', icon: Layers },
        { id: 'quiz', label: t('filter.quiz') || 'QCM', icon: CheckSquare },
        { id: 'mindmap', label: t('filter.mindmaps') || 'Cartes Mentales', icon: Brain },
        { id: 'summary', label: t('filter.summaries') || 'Résumés', icon: FileText },
    ]

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
            {filters.map((tab) => {
                const isActive = activeFilters.includes(tab.id as FilterTab)
                return (
                    <button
                        key={tab.id}
                        onClick={() => onToggle(tab.id as FilterTab)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                            isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}

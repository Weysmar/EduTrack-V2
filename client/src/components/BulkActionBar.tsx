import { Trash2, X, CheckSquare, Loader2, Brain, ChevronDown, FileText, Scale, FileEdit, BookOpen, BrainCircuit, Layers } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { createPortal } from 'react-dom'
import { useState, useRef, useEffect } from 'react'
import { RevisionGenerationMode } from '@/components/GenerateExerciseModal'

export type BulkGenerateMode = RevisionGenerationMode | 'summary'

interface BulkActionBarProps {
    selectedCount: number
    onClearSelection: () => void
    onDelete: () => void
    onGenerate?: (mode: BulkGenerateMode) => void
    isDeleting?: boolean
}

export function BulkActionBar({ selectedCount, onClearSelection, onDelete, onGenerate, isDeleting = false }: BulkActionBarProps) {
    const { t } = useLanguage()
    const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsGenerateMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    if (selectedCount === 0) return null

    const handleGenerateClick = (mode: BulkGenerateMode) => {
        setIsGenerateMenuOpen(false)
        onGenerate?.(mode)
    }

    return createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-4 bg-foreground text-background px-3 md:px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-8 duration-200 max-w-[95vw]">
            <div className="flex items-center gap-3 border-r border-background/20 pr-4">
                <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                    {selectedCount}
                </div>
                <span className="font-medium text-sm whitespace-nowrap">
                    {selectedCount > 1 ? t('bulk.selected_plural') : t('bulk.selected_singular')}
                </span>
            </div>

            <div className="flex items-center gap-2">
                {onGenerate && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsGenerateMenuOpen(!isGenerateMenuOpen)}
                            aria-label={t('bulk.generate')}
                            aria-expanded={isGenerateMenuOpen}
                            aria-haspopup="true"
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary hover:text-primary-foreground rounded-md transition-colors text-sm font-medium"
                        >
                            <Brain className="h-4 w-4" aria-hidden="true" />
                            {t('bulk.generate') || "Réviser / IA"}
                            <ChevronDown className={`h-3 w-3 transition-transform ${isGenerateMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>

                        {isGenerateMenuOpen && (
                            <div className="absolute bottom-full mb-2 left-0 bg-card text-card-foreground border rounded-xl shadow-2xl min-w-[220px] overflow-hidden animate-in slide-in-from-bottom-2 duration-150 p-1 space-y-0.5">
                                <button
                                    onClick={() => handleGenerateClick('flashcards')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <Layers className="h-4 w-4 text-orange-500" aria-hidden="true" />
                                    {t('bulk.generate.flashcards') || "Flashcards"}
                                </button>
                                <button
                                    onClick={() => handleGenerateClick('quiz')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <CheckSquare className="h-4 w-4 text-green-500" aria-hidden="true" />
                                    {t('bulk.generate.quiz') || "QCM"}
                                </button>
                                <button
                                    onClick={() => handleGenerateClick('true_false')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <Scale className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                                    Questions Vrai / Faux
                                </button>
                                <button
                                    onClick={() => handleGenerateClick('cloze')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <FileEdit className="h-4 w-4 text-teal-500" aria-hidden="true" />
                                    Exercices à trous
                                </button>
                                <button
                                    onClick={() => handleGenerateClick('sheet')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <BookOpen className="h-4 w-4 text-purple-500" aria-hidden="true" />
                                    Fiche de révision
                                </button>
                                <button
                                    onClick={() => handleGenerateClick('mindmap')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <BrainCircuit className="h-4 w-4 text-pink-500" aria-hidden="true" />
                                    Mind Map IA
                                </button>
                                <button
                                    onClick={() => handleGenerateClick('summary')}
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors text-xs font-semibold flex items-center gap-2.5 rounded-lg"
                                >
                                    <FileText className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                                    {t('bulk.generate.summary') || "Résumé de cours"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    aria-label={t('common.delete')}
                    aria-busy={isDeleting}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors text-sm font-medium"
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    {t('common.delete')}
                </button>

                <button
                    onClick={onClearSelection}
                    aria-label={t('common.cancel')}
                    className="p-1.5 hover:bg-background/20 rounded-full transition-colors ml-1"
                    title={t('common.cancel')}
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>,
        document.body
    )
}

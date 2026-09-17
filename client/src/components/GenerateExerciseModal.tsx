import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { generateFlashcards, GenerationParams } from '@/lib/flashcards/generator'
import { generateQuizQuestions } from '@/lib/quiz/generator'
import { generateTrueFalseQuestions } from '@/lib/revision/trueFalseGenerator'
import { generateClozeExercises } from '@/lib/revision/clozeGenerator'
import { generateRevisionSheet } from '@/lib/revision/sheetGenerator'
import { 
    Loader2, Brain, AlertCircle, CheckSquare, Layers, 
    Scale, FileEdit, BookOpen, BrainCircuit, Sparkles 
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/store/profileStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ModelSelector } from '@/components/ModelSelector'
import { useAIProvider } from '@/hooks/useAIProvider'
import { useLanguage } from '@/components/language-provider'

import type { FileCategory } from '@/config/aiModels'

export type RevisionGenerationMode = 'flashcards' | 'quiz' | 'true_false' | 'cloze' | 'sheet' | 'mindmap'

interface GenerateExerciseModalProps {
    isOpen: boolean
    onClose: () => void
    sourceContent: string
    courseId?: string
    itemId?: string
    sourceTitle: string
    initialMode?: RevisionGenerationMode
    fileCategory?: FileCategory
}

export function GenerateExerciseModal({
    isOpen,
    onClose,
    sourceContent,
    courseId,
    itemId,
    sourceTitle,
    initialMode = 'flashcards',
    fileCategory
}: GenerateExerciseModalProps) {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { activeProfile, getApiKey } = useProfileStore()
    const geminiKey = getApiKey('google_gemini_exercises') || getApiKey('google_gemini_summaries')
    const perplexityKey = getApiKey('perplexity_exercises') || getApiKey('perplexity_summaries')
    const ai = useAIProvider({ geminiKey, perplexityKey })

    const [mode, setMode] = useState<RevisionGenerationMode>(initialMode)
    const [isLoading, setIsLoading] = useState(false)
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'mixed'>('mixed')
    const [count, setCount] = useState<number>(10)
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['concept', 'fact'])
    const [error, setError] = useState<string | null>(null)
    const isOnline = useOnlineStatus()

    const hasKeyForSelectedProvider = ai.hasKeyForProvider

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode)
            setCount(initialMode === 'cloze' ? 3 : 10)
            setDifficulty('mixed')
            setSelectedTypes(['concept', 'fact'])
            setError(null)
            ai.reset()
        }
    }, [isOpen, initialMode, geminiKey, perplexityKey])

    const handleTypeToggle = (type: string) => {
        if (selectedTypes.includes(type)) {
            setSelectedTypes(selectedTypes.filter(t => t !== type))
        } else {
            setSelectedTypes([...selectedTypes, type])
        }
    }

    const handleGenerate = async () => {
        if (!hasKeyForSelectedProvider) {
            setError(`Clé API manquante pour ${ai.provider === 'google' ? 'Google Gemini' : 'Perplexity'}. Veuillez renseigner votre clé personnelle dans Profil > Paramètres > Clés API.`);
            return;
        }

        if (!sourceContent || !sourceContent.trim()) {
            setError(t('exercise.error.noContent') || "Aucun contenu disponible pour la génération. Veuillez vous assurer que le document contient du texte.");
            return;
        }

        setIsLoading(true)
        setError(null)

        try {
            const now = new Date()
            const { flashcardQueries, quizQueries, itemQueries, mindmapQueries } = await import('@/lib/api/queries')
            const difficultyLabel = difficulty === 'easy' ? 'Facile' : difficulty === 'hard' ? 'Difficile' : difficulty === 'mixed' ? 'Mixte' : 'Moyen'

            // 1. FLASHCARDS
            if (mode === 'flashcards') {
                const cards = await generateFlashcards({
                    content: sourceContent,
                    count,
                    difficulty,
                    types: selectedTypes as GenerationParams['types'],
                    provider: ai.provider,
                    model: ai.model
                })

                if (!cards || cards.length === 0) throw new Error("Aucune flashcard générée.")

                const createdSet = await flashcardQueries.create({
                    courseId,
                    itemId,
                    profileId: activeProfile?.id || "",
                    name: `${sourceTitle} - Flashcards`,
                    description: `Généré depuis ${sourceTitle} (${difficultyLabel}, ${count} cartes)`,
                    count: cards.length,
                    cards: cards.map(c => ({
                        front: c.front || '?',
                        back: c.back || '...',
                        difficulty: c.difficulty || 'normal'
                    }))
                })

                queryClient.invalidateQueries({ queryKey: ['flashcards'] })
                if (courseId) {
                    queryClient.invalidateQueries({ queryKey: ['flashcards', courseId] })
                    queryClient.invalidateQueries({ queryKey: ['items', courseId] })
                }

                toast.success("Flashcards générées avec succès !")
                onClose()
                navigate(`/edu/flashcards/study/${createdSet.id}`)
            } 
            // 2. QCM (Choix Multiples)
            else if (mode === 'quiz') {
                const questions = await generateQuizQuestions({
                    content: sourceContent,
                    count,
                    difficulty,
                    types: selectedTypes as any,
                    provider: ai.provider,
                    model: ai.model
                })

                if (!questions || questions.length === 0) throw new Error("Aucune question retournée.")

                const quiz = await quizQueries.create({
                    courseId,
                    itemId,
                    profileId: activeProfile?.id || "",
                    name: `${sourceTitle} - QCM`,
                    description: `QCM généré depuis ${sourceTitle}`,
                    difficulty,
                    questionCount: questions.length,
                    createdAt: now,
                    generatedBy: ai.provider,
                    attemptsCount: 0,
                    questions: questions.map(q => ({
                        stem: q.stem || '?',
                        options: q.options || [],
                        correctAnswer: q.correctAnswer ?? 0,
                        explanation: q.explanation || ''
                    }))
                })

                queryClient.invalidateQueries({ queryKey: ['quizzes'] })
                if (courseId) {
                    queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] })
                    queryClient.invalidateQueries({ queryKey: ['items', courseId] })
                }

                toast.success("Quiz QCM généré avec succès !")
                onClose()
                navigate(`/edu/quiz/study/${quiz.id}`)
            }
            // 3. QUESTIONS VRAI / FAUX
            else if (mode === 'true_false') {
                const tfQuestions = await generateTrueFalseQuestions({
                    content: sourceContent,
                    sourceTitle,
                    count,
                    difficulty,
                    provider: ai.provider,
                    model: ai.model
                })

                if (!tfQuestions || tfQuestions.length === 0) throw new Error("Aucune question Vrai/Faux générée.")

                const quiz = await quizQueries.create({
                    courseId,
                    itemId,
                    profileId: activeProfile?.id || "",
                    name: `${sourceTitle} - Vrai / Faux`,
                    description: `Questions Vrai/Faux générées depuis ${sourceTitle}`,
                    difficulty,
                    questionCount: tfQuestions.length,
                    createdAt: now,
                    generatedBy: ai.provider,
                    attemptsCount: 0,
                    questions: tfQuestions.map(q => ({
                        stem: q.stem || '?',
                        options: q.options || ['Vrai', 'Faux'],
                        correctAnswer: q.correctAnswer ?? 0,
                        explanation: q.explanation || ''
                    }))
                })

                queryClient.invalidateQueries({ queryKey: ['quizzes'] })
                if (courseId) {
                    queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] })
                    queryClient.invalidateQueries({ queryKey: ['items', courseId] })
                }

                toast.success("Questions Vrai/Faux générées avec succès !")
                onClose()
                navigate(`/edu/quiz/study/${quiz.id}`)
            }
            // 4. EXERCICES À TROUS
            else if (mode === 'cloze') {
                const clozeData = await generateClozeExercises({
                    content: sourceContent,
                    sourceTitle,
                    count: Math.min(count, 5), // Paragraph count
                    difficulty,
                    provider: ai.provider,
                    model: ai.model
                })

                if (!clozeData || !clozeData.exercises?.length) throw new Error("Aucun exercice à trous généré.")

                const createdItem = await itemQueries.create({
                    courseId: courseId || "",
                    profileId: activeProfile?.id || "",
                    type: 'cloze',
                    title: `${sourceTitle} - Exercice à trous`,
                    content: JSON.stringify(clozeData),
                    difficulty,
                    status: 'active'
                })

                if (courseId) {
                    queryClient.invalidateQueries({ queryKey: ['items', courseId] })
                }

                toast.success("Exercice à trous généré avec succès !")
                onClose()
                if (courseId) {
                    navigate(`/edu/course/${courseId}/item/${createdItem.id}`)
                }
            }
            // 5. FICHE DE RÉVISION
            else if (mode === 'sheet') {
                const sheetData = await generateRevisionSheet({
                    content: sourceContent,
                    sourceTitle,
                    difficulty,
                    focus: selectedTypes,
                    provider: ai.provider,
                    model: ai.model
                })

                if (!sheetData) throw new Error("Échec de la génération de la fiche.")

                const createdItem = await itemQueries.create({
                    courseId: courseId || "",
                    profileId: activeProfile?.id || "",
                    type: 'sheet',
                    title: `${sourceTitle} - Fiche de révision`,
                    content: JSON.stringify(sheetData),
                    difficulty,
                    status: 'completed'
                })

                if (courseId) {
                    queryClient.invalidateQueries({ queryKey: ['items', courseId] })
                }

                toast.success("Fiche de révision générée avec succès !")
                onClose()
                if (courseId) {
                    navigate(`/edu/course/${courseId}/item/${createdItem.id}`)
                }
            }
            // 6. MIND MAP IA
            else if (mode === 'mindmap') {
                const mindMap = await mindmapQueries.generate({
                    content: sourceContent,
                    name: `${sourceTitle} - Mind Map`,
                    courseId,
                    provider: ai.provider,
                    model: ai.model
                })

                queryClient.invalidateQueries({ queryKey: ['mindmaps'] })
                if (courseId) {
                    queryClient.invalidateQueries({ queryKey: ['mindmaps', courseId] })
                    queryClient.invalidateQueries({ queryKey: ['items', courseId] })
                }

                toast.success("Mind Map générée avec succès !")
                onClose()
                navigate(`/edu/mindmaps?id=${mindMap.id}`)
            }

        } catch (e: any) {
            console.error("Exercise generation failed:", e)
            const msg = e.response?.data?.error || e.response?.data?.message || e.message || "Échec de génération. Vérifiez votre clé API ou votre connexion internet et réessayez."
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-xl md:max-w-2xl transform rounded-2xl bg-card border shadow-2xl transition-all max-h-[92vh] flex flex-col overflow-hidden">
                                <Dialog.Title className="text-xl sm:text-2xl font-bold flex items-center justify-between p-5 sm:p-6 pb-4 border-b shrink-0 bg-muted/20">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-primary/10 text-primary rounded-xl">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <span>Génération de Révision IA</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                                        {sourceTitle}
                                    </span>
                                </Dialog.Title>

                                <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">
                                    {/* 6 Revision Modes Grid */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                            Format Pédagogique Souhaité
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {/* Flashcards */}
                                            <button
                                                type="button"
                                                onClick={() => setMode('flashcards')}
                                                className={cn(
                                                    "flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                                                    mode === 'flashcards'
                                                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <Layers className="h-5 w-5 mb-2 text-orange-500" />
                                                <span className="font-bold text-xs sm:text-sm">Flashcards</span>
                                                <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">Cartes mémoire</span>
                                            </button>

                                            {/* QCM */}
                                            <button
                                                type="button"
                                                onClick={() => setMode('quiz')}
                                                className={cn(
                                                    "flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                                                    mode === 'quiz'
                                                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <CheckSquare className="h-5 w-5 mb-2 text-green-500" />
                                                <span className="font-bold text-xs sm:text-sm">QCM</span>
                                                <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">Choix multiples</span>
                                            </button>

                                            {/* Vrai / Faux */}
                                            <button
                                                type="button"
                                                onClick={() => setMode('true_false')}
                                                className={cn(
                                                    "flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                                                    mode === 'true_false'
                                                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <Scale className="h-5 w-5 mb-2 text-indigo-500" />
                                                <span className="font-bold text-xs sm:text-sm">Vrai / Faux</span>
                                                <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">Quiz binaire rapide</span>
                                            </button>

                                            {/* Exercices à trous */}
                                            <button
                                                type="button"
                                                onClick={() => setMode('cloze')}
                                                className={cn(
                                                    "flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                                                    mode === 'cloze'
                                                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <FileEdit className="h-5 w-5 mb-2 text-teal-500" />
                                                <span className="font-bold text-xs sm:text-sm">Texte à trous</span>
                                                <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">Mots à replacer</span>
                                            </button>

                                            {/* Fiche de révision */}
                                            <button
                                                type="button"
                                                onClick={() => setMode('sheet')}
                                                className={cn(
                                                    "flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                                                    mode === 'sheet'
                                                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <BookOpen className="h-5 w-5 mb-2 text-purple-500" />
                                                <span className="font-bold text-xs sm:text-sm">Fiche Révision</span>
                                                <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">Synthèse & Pièges</span>
                                            </button>

                                            {/* Mind Map IA */}
                                            <button
                                                type="button"
                                                onClick={() => setMode('mindmap')}
                                                className={cn(
                                                    "flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left",
                                                    mode === 'mindmap'
                                                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                                                        : "border-border hover:border-primary/50 hover:bg-muted/40 text-foreground"
                                                )}
                                            >
                                                <BrainCircuit className="h-5 w-5 mb-2 text-pink-500" />
                                                <span className="font-bold text-xs sm:text-sm">Mind Map IA</span>
                                                <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">Carte mentale visuelle</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Provider & Model Selection */}
                                    <div className="space-y-4">
                                        {!isOnline && (
                                            <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-600 p-3 rounded-md mb-4 flex items-center gap-2 text-sm">
                                                <AlertCircle className="h-4 w-4 shrink-0" />
                                                <span>Vous êtes hors ligne. La génération nécessite une connexion internet.</span>
                                            </div>
                                        )}
                                        {(!sourceContent || !sourceContent.trim()) && (
                                            <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 p-3 rounded-md mb-2 flex items-start gap-2 text-sm">
                                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <span>Aucun contenu textuel détecté. La génération risque d'échouer. Assurez-vous que le fichier contient du texte.</span>
                                            </div>
                                        )}
                                        <ModelSelector
                                            provider={ai.provider}
                                            model={ai.model}
                                            setProvider={ai.setProvider}
                                            setModel={ai.setModel}
                                            hasKeyForProvider={ai.hasKeyForProvider}
                                            geminiKey={geminiKey}
                                            perplexityKey={perplexityKey}
                                            onClose={onClose}
                                            contentLength={sourceContent?.length}
                                            fileCategory={fileCategory}
                                        />
                                    </div>

                                    {/* Count / Paragraphs Options (Not needed for MindMap or Sheet) */}
                                    {mode !== 'mindmap' && mode !== 'sheet' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">
                                                {mode === 'flashcards' && 'Nombre de cartes'}
                                                {mode === 'quiz' && 'Nombre de questions QCM'}
                                                {mode === 'true_false' && 'Nombre d\'affirmations Vrai/Faux'}
                                                {mode === 'cloze' && 'Nombre de paragraphes à trous'}
                                            </label>
                                            <div className="flex gap-2">
                                                {(mode === 'cloze' ? [2, 3, 4, 5] : [5, 10, 15, 20]).map(n => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() => setCount(n)}
                                                        className={cn(
                                                            "px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all min-w-[44px]",
                                                            count === n
                                                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                                : "hover:bg-muted text-muted-foreground border-border"
                                                        )}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Difficulty (Applicable to quiz, tf, flashcards, cloze, sheet) */}
                                    {mode !== 'mindmap' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Difficulté Cible</label>
                                            <select
                                                value={difficulty}
                                                onChange={(e: any) => setDifficulty(e.target.value)}
                                                className="w-full bg-background border px-3 py-2.5 rounded-xl text-sm ring-offset-background focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="easy">Facile (Définitions & Notions de base)</option>
                                                <option value="normal">Moyen (Concepts & Compréhension)</option>
                                                <option value="hard">Difficile (Pièges, Applications & Analyse)</option>
                                                <option value="mixed">Mixte (Équilibré)</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Types / Axes for Flashcards, QCM and Sheet */}
                                    {(mode === 'flashcards' || mode === 'quiz' || mode === 'sheet') && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Axes de Travail Prioritaires</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { id: 'concept', label: 'Notions fondamentales' },
                                                    { id: 'fact', label: 'Définitions & Termes clés' },
                                                    { id: 'calculation', label: 'Formules & Règles' },
                                                    { id: 'application', label: 'Pièges d\'examen' }
                                                ].map(type => (
                                                    <label key={type.id} className="flex items-center gap-2.5 text-xs sm:text-sm p-3 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTypes.includes(type.id)}
                                                            onChange={() => handleTypeToggle(type.id)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                                        />
                                                        <span>{type.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="p-3.5 bg-destructive/10 text-destructive rounded-xl text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-2.5 p-5 sm:p-6 pt-4 border-t shrink-0 bg-muted/10 pb-safe">
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="px-4 py-2.5 text-xs sm:text-sm font-medium hover:bg-muted rounded-xl transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading || !isOnline}
                                        className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-primary text-primary-foreground rounded-xl transition-all hover:opacity-90 flex items-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {isLoading 
                                            ? 'Génération en cours...' 
                                            : mode === 'flashcards' ? 'Générer les Flashcards'
                                            : mode === 'quiz' ? 'Générer le QCM'
                                            : mode === 'true_false' ? 'Générer les Vrai/Faux'
                                            : mode === 'cloze' ? 'Générer l\'Exercice à trous'
                                            : mode === 'sheet' ? 'Générer la Fiche'
                                            : 'Générer la Mind Map'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

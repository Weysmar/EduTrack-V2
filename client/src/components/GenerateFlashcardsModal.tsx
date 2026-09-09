import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { generateFlashcards, GenerationParams } from '@/lib/flashcards/generator'
import { Loader2, Brain, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useProfileStore } from '@/store/profileStore'
import { useLanguage } from '@/components/language-provider'
import { ModelSelector } from '@/components/ModelSelector'
import { useAIProvider } from '@/hooks/useAIProvider'

import type { FileCategory } from '@/config/aiModels'

interface GenerateFlashcardsModalProps {
    isOpen: boolean
    onClose: () => void
    sourceContent: string
    courseId?: number
    itemId?: number
    sourceTitle: string
    fileCategory?: FileCategory
}

export function GenerateFlashcardsModal({
    isOpen,
    onClose,
    sourceContent,
    courseId,
    itemId,
    sourceTitle,
    fileCategory
}: GenerateFlashcardsModalProps) {
    const { t, language } = useLanguage()
    const navigate = useNavigate()
    const isOnline = useOnlineStatus()
    const { getApiKey } = useProfileStore()

    const geminiKey = getApiKey('google_gemini_exercises') || getApiKey('google_gemini_summaries')
    const perplexityKey = getApiKey('perplexity_exercises') || getApiKey('perplexity_summaries')
    const ai = useAIProvider({ geminiKey, perplexityKey })

    const [isLoading, setIsLoading] = useState(false)
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'mixed'>('mixed')
    const [count, setCount] = useState<number>(10)
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['concepts'])
    const [error, setError] = useState<string | null>(null)

    const hasContent = !!sourceContent?.trim()

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            ai.reset()
            setDifficulty('mixed')
            setCount(10)
            setSelectedTypes(['concepts'])
            setError(null)
        }
    }, [isOpen, geminiKey, perplexityKey])


    const handleTypeToggle = (type: string) => {
        if (selectedTypes.includes(type)) {
            setSelectedTypes(selectedTypes.filter(t => t !== type))
        } else {
            setSelectedTypes([...selectedTypes, type])
        }
    }

    const handleGenerate = async () => {
        if (!ai.hasKeyForProvider) {
            setError(`Clé API manquante pour ${ai.provider === 'google' ? 'Google Gemini' : 'Perplexity'}. Veuillez renseigner votre clé dans Profil > Paramètres > Clés API.`)
            return
        }
        if (!hasContent) {
            setError(language === 'fr'
                ? "Aucun contenu textuel disponible. Le document n'a pas pu être analysé (fichier vide, image sans OCR ou format non supporté)."
                : "No text content available. The document could not be parsed (empty file, image without OCR, or unsupported format).")
            return
        }
        if (selectedTypes.length === 0) {
            setError(language === 'fr' ? 'Veuillez sélectionner au moins un domaine de focalisation.' : 'Please select at least one focus area.')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const cards = await generateFlashcards({
                content: sourceContent,
                count,
                difficulty,
                types: selectedTypes as GenerationParams['types'],
                provider: ai.provider,
                model: ai.model
            })

            const difficultyLabel = difficulty === 'easy' ? 'Facile' : difficulty === 'hard' ? 'Difficile' : difficulty === 'mixed' ? 'Mixte' : 'Moyen'
            const payload = {
                courseId,
                itemId,
                name: `${sourceTitle} - Flashcards`,
                description: `Généré depuis ${sourceTitle} (${difficultyLabel}, ${count} cartes)`,
                cards: cards.map(c => ({
                    front: c.front || '?',
                    back: c.back || '...',
                    difficulty: c.difficulty || 'normal'
                }))
            }

            const { flashcardQueries } = await import('@/lib/api/queries')
            const newSet = await flashcardQueries.create(payload)

            onClose()
            navigate(`/edu/flashcards/study/${newSet.id}`)

        } catch (e: any) {
            console.error(e)
            setError(language === 'fr'
                ? `Échec de la génération : ${e?.message || 'Erreur inconnue'}. Vérifiez votre connexion et réessayez.`
                : `Generation failed: ${e?.message || 'Unknown error'}. Check your connection and try again.`)
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
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                            <Dialog.Panel className="w-full max-w-md md:max-w-lg transform rounded-xl bg-card border shadow-xl transition-all max-h-[90vh] flex flex-col">
                                <Dialog.Title className="text-xl font-bold flex items-center gap-2 p-5 pb-4 border-b shrink-0">
                                    <Brain className="h-5 w-5 text-primary" />
                                    {language === 'fr' ? 'Générer des Flashcards IA' : 'Generate AI Flashcards'}
                                </Dialog.Title>

                                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                                    {/* Offline warning */}
                                    {!isOnline && (
                                        <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 p-3 rounded-md flex items-center gap-2 text-sm">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{language === 'fr' ? 'Vous êtes hors ligne. La génération nécessite une connexion.' : 'You are offline. Generation requires an internet connection.'}</span>
                                        </div>
                                    )}

                                    {/* Empty content warning */}
                                    {!hasContent && (
                                        <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 p-3 rounded-md flex items-start gap-2 text-sm">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>
                                                {language === 'fr'
                                                    ? "Aucun contenu textuel détecté dans ce document. La génération risque d'échouer. Assurez-vous que le fichier contient du texte extractible (PDF, DOCX, TXT, SQL…)."
                                                    : "No text content detected in this document. Generation may fail. Make sure the file contains extractable text (PDF, DOCX, TXT, SQL…)."}
                                            </span>
                                        </div>
                                    )}

                                    {/* Provider & Model Selection */}
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

                                    {/* Count */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            {language === 'fr' ? 'Nombre de cartes' : 'Number of Cards'}
                                        </label>
                                        <div className="flex gap-2">
                                            {[5, 10, 20, 30].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setCount(n)}
                                                    className={`px-4 py-2.5 rounded-md border text-sm font-medium transition-colors min-h-[44px] min-w-[48px] touch-manipulation
                                                        ${count === n ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            {language === 'fr' ? 'Difficulté ciblée' : 'Target Difficulty'}
                                        </label>
                                        <select
                                            value={difficulty}
                                            onChange={(e: any) => setDifficulty(e.target.value)}
                                            className="w-full bg-muted/50 border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            <option value="easy">{language === 'fr' ? 'Facile (Définitions & Faits)' : 'Easy (Definitions & Facts)'}</option>
                                            <option value="normal">{language === 'fr' ? 'Normal (Concepts & Relations)' : 'Normal (Concepts & Relations)'}</option>
                                            <option value="hard">{language === 'fr' ? 'Difficile (Applications & Analyse)' : 'Hard (Applications & Analysis)'}</option>
                                            <option value="mixed">{language === 'fr' ? 'Mixte (Adaptatif - Recommandé)' : 'Mixed (Adaptive - Recommended)'}</option>
                                        </select>
                                    </div>

                                    {/* Focus areas */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            {language === 'fr' ? 'Domaines de focalisation' : 'Focus Areas'}
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { key: 'facts', label: language === 'fr' ? 'Faits & Définitions' : 'Facts & Definitions' },
                                                { key: 'concepts', label: language === 'fr' ? 'Concepts' : 'Concepts' },
                                                { key: 'calculations', label: language === 'fr' ? 'Calculs / Formules' : 'Calculations' },
                                                { key: 'applications', label: language === 'fr' ? 'Applications' : 'Applications' }
                                            ].map(({ key, label }) => (
                                                <label key={key} className="flex items-center gap-2 text-sm p-3 border rounded-lg hover:bg-muted/50 cursor-pointer min-h-[44px] transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTypes.includes(key)}
                                                        onChange={() => handleTypeToggle(key)}
                                                        className="rounded border-gray-300 h-4 w-4 accent-primary"
                                                    />
                                                    <span>{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 text-red-500 rounded-md text-sm flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 p-5 pt-4 border-t shrink-0 pb-safe">
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                                    >
                                        {t('common.cancel') || 'Annuler'}
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading || !isOnline || !ai.hasKeyForProvider}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md transition-all hover:opacity-90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {isLoading
                                            ? (language === 'fr' ? 'Génération en cours…' : 'Generating…')
                                            : (language === 'fr' ? 'Générer les flashcards' : 'Generate Flashcards')}
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

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { generateFlashcards, GenerationParams } from '@/lib/flashcards/generator'
import { Loader2, Brain, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { INITIAL_CARD_STATE } from '@/lib/flashcards/spaced-repetition'
import { useNavigate } from 'react-router-dom'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

interface GenerateFlashcardsModalProps {
    isOpen: boolean
    onClose: () => void
    sourceContent: string
    courseId?: number
    itemId?: number
    sourceTitle: string
}

export function GenerateFlashcardsModal({ isOpen, onClose, sourceContent, courseId, itemId, sourceTitle }: GenerateFlashcardsModalProps) {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard' | 'mixed'>('mixed')
    const [count, setCount] = useState<number>(10)
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['concepts'])
    const [error, setError] = useState<string | null>(null)
    const isOnline = useOnlineStatus()

    const handleTypeToggle = (type: string) => {
        if (selectedTypes.includes(type)) {
            setSelectedTypes(selectedTypes.filter(t => t !== type))
        } else {
            setSelectedTypes([...selectedTypes, type])
        }
    }

    const handleGenerate = async () => {
        if (!sourceContent.trim()) {
            setError("No content available to generate from.")
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
                provider: 'perplexity'
            })

            // Construct payload for API
            const payload = {
                courseId,
                itemId,
                name: `${sourceTitle} - Flashcards`,
                description: `Generated from ${sourceTitle} (${difficulty}, ${count} cards)`,
                cards: cards.map(c => ({
                    front: c.front || '?',
                    back: c.back || '...',
                    difficulty: c.difficulty || 'normal'
                }))
                // generatedBy: 'perplexity' // Add to schema if needed
            }

            const { flashcardQueries } = await import('@/lib/api/queries');
            const newSet = await flashcardQueries.create(payload);

            onClose()
            navigate(`/flashcards/study/${newSet.id}`)

        } catch (e: any) {
            console.error(e)
            setError("Échec de génération. Vérifiez votre connexion internet et réessayez.")
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
                            <Dialog.Panel className="w-full max-w-md md:max-w-lg transform rounded-xl bg-card border shadow-xl transition-all max-h-[85vh] flex flex-col">
                                <Dialog.Title className="text-2xl font-bold flex items-center gap-2 p-6 pb-4 border-b shrink-0">
                                    <Brain className="h-6 w-6 text-primary" />
                                    Generate AI Flashcards
                                </Dialog.Title>

                                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                                    {!isOnline && (
                                        <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-600 p-3 rounded-md mb-4 flex items-center gap-2 text-sm">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>Vous êtes hors ligne. La génération nécessite une connexion.</span>
                                        </div>
                                    )}
                                    {/* Count */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Number of Cards</label>
                                        <div className="flex gap-2">
                                            {[5, 10, 20].map(n => (
                                                <button
                                                    key={n}
                                                    onClick={() => setCount(n)}
                                                    className={`px-4 py-3 rounded-md border text-sm transition-colors min-h-[44px] min-w-[44px] touch-manipulation ${count === n ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Target Difficulty</label>
                                        <select
                                            value={difficulty}
                                            onChange={(e: any) => setDifficulty(e.target.value)}
                                            className="w-full bg-muted/50 border rounded-md p-2 text-sm"
                                        >
                                            <option value="easy">Easy (Definitions & Facts)</option>
                                            <option value="normal">Normal (Concepts & Relations)</option>
                                            <option value="hard">Hard (Applications & Analysis)</option>
                                            <option value="mixed">Mixed (Adaptive)</option>
                                        </select>
                                    </div>

                                    {/* Types */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Focus Areas</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['facts', 'concepts', 'calculations', 'applications'].map(type => (
                                                <label key={type} className="flex items-center gap-2 text-sm p-3 border rounded hover:bg-muted/50 cursor-pointer min-h-[44px]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTypes.includes(type)}
                                                        onChange={() => handleTypeToggle(type)}
                                                        className="rounded border-gray-300 h-5 w-5"
                                                    />
                                                    <span className="capitalize">{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-500/10 text-red-500 rounded-md text-sm flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            {error}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0 pb-safe">
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading || !isOnline}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md transition-all hover:opacity-90 flex items-center gap-2"
                                    >
                                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {isLoading ? 'Generating...' : 'Start Generation'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition >
    )
}

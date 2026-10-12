import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { summaryQueries } from '@/lib/api/queries'
import { SummaryOptions, SummaryResult, SummaryType, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { formatSummaryMarkdown } from '@/lib/summary/formatSummary'
import { toast } from "sonner"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAIErrorMessage, isAbortError } from '@/lib/ai/errors'
import { aiMessage } from '@/lib/ai/messages'

export function useSummary(itemId: string | number, itemType: SummaryType, initialText?: string, courseId?: string) {
    const queryClient = useQueryClient()
    const strItemId = String(itemId || '')

    const {
        data: querySummary = null,
        isLoading: isLoadingQuery,
        error: queryError,
        refetch
    } = useQuery<SummaryResult | null>({
        queryKey: ['summary', strItemId],
        queryFn: async () => {
            if (!strItemId || strItemId === '0' || strItemId === 'undefined') return null
            try {
                const data = await summaryQueries.getOne(strItemId)
                return data || null
            } catch (e) {
                console.error("Failed to load summary", e)
                return null
            }
        },
        enabled: !!strItemId && strItemId !== '0' && strItemId !== 'undefined',
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    })

    const [isGenerating, setIsGenerating] = useState(false)
    const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null)
    const [generationError, setGenerationError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    // Annule une génération en cours si le composant est démonté
    useEffect(() => () => abortRef.current?.abort(), [])

    const setSummary = useCallback((newSummary: SummaryResult | null) => {
        if (!strItemId) return
        queryClient.setQueryData(['summary', strItemId], newSummary)
    }, [queryClient, strItemId])

    /** Annule la génération en cours (sans afficher d'erreur). */
    const cancel = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    const generate = useCallback(async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS, forceText?: string) => {
        const textToProcess = forceText || initialText
        if (!textToProcess) {
            setGenerationError(aiMessage('ai.error.noContent'))
            return
        }

        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        const startedAt = Date.now()
        setIsGenerating(true)
        setGenerationStartedAt(startedAt)
        setGenerationError(null)
        try {
            const { AIServiceFactory } = await import('@/lib/ai/factory')

            const generatedText = await AIServiceFactory.generateSummary(textToProcess, options, { signal: controller.signal })
            const processingTimeMs = Date.now() - startedAt
            const cleanedContent = formatSummaryMarkdown(generatedText)

            const result: SummaryResult = {
                id: uuidv4(),
                itemId: strItemId,
                itemType: itemType,
                courseId: courseId || undefined,
                content: cleanedContent,
                stats: {
                    originalWordCount: textToProcess.split(/\s+/).filter(Boolean).length,
                    summaryWordCount: cleanedContent.split(/\s+/).filter(Boolean).length,
                    compressionRatio: cleanedContent.length / (textToProcess.length || 1),
                    processingTimeMs
                },
                options: options,
                createdAt: Date.now()
            }

            const saved = await saveSummary(result)
            queryClient.setQueryData(['summary', strItemId], saved || result)
            return saved || result

        } catch (e: unknown) {
            if (isAbortError(e)) {
                toast.info(aiMessage('ai.cancelled'))
                return
            }
            console.error("AI Error", e)
            setGenerationError(getAIErrorMessage(e, { provider: options.provider }))
        } finally {
            if (abortRef.current === controller) abortRef.current = null
            setIsGenerating(false)
            setGenerationStartedAt(null)
        }
    }, [strItemId, itemType, initialText, courseId, queryClient])

    const saveSummary = async (result: SummaryResult) => {
        try {
            const dataToSave = {
                ...result,
                courseId: result.courseId || courseId || null
            }

            const savedRecord = await summaryQueries.save(dataToSave)

            queryClient.setQueryData(['summary', strItemId], savedRecord || dataToSave)
            queryClient.invalidateQueries({ queryKey: ['summaries'] })
            queryClient.invalidateQueries({ queryKey: ['summary', strItemId] })
            if (courseId) {
                queryClient.invalidateQueries({ queryKey: ['summaries', courseId] })
            }
            toast.success("Résumé sauvegardé avec succès")
            return savedRecord
        } catch (dbErr) {
            console.error("Failed to save summary", dbErr)
            toast.error("Erreur lors de la sauvegarde du résumé")
            return null
        }
    }

    const remove = useCallback(async (customId?: string) => {
        const targetId = customId || querySummary?.id || (strItemId ? strItemId : undefined)
        if (!targetId) return

        try {
            await summaryQueries.delete(targetId)
            queryClient.setQueryData(['summary', strItemId], null)
            toast.success("Résumé supprimé")
            queryClient.invalidateQueries({ queryKey: ['summaries'] })
            queryClient.invalidateQueries({ queryKey: ['summary', strItemId] })
            if (courseId) {
                queryClient.invalidateQueries({ queryKey: ['summaries', courseId] })
            }
            queryClient.invalidateQueries({ queryKey: ['items'] })
        } catch (e) {
            console.error("Failed to delete summary", e)
            toast.error("Erreur lors de la suppression du résumé")
        }
    }, [querySummary, strItemId, courseId, queryClient])

    return {
        summary: querySummary,
        setSummary,
        refetch,
        generate,
        cancel,
        remove,
        /** Vrai uniquement pendant une génération IA (plus pendant le simple chargement du résumé existant) */
        isGenerating,
        /** Vrai pendant le chargement initial du résumé existant */
        isFetching: isLoadingQuery,
        /** Timestamp de début de la génération en cours (pour afficher le temps écoulé) */
        generationStartedAt,
        error: generationError || (queryError ? (queryError as any).message : null)
    }
}

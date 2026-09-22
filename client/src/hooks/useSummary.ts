import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { summaryQueries } from '@/lib/api/queries'
import { SummaryOptions, SummaryResult, SummaryType, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { formatSummaryMarkdown } from '@/lib/summary/formatSummary'
import { toast } from "sonner"
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
    const [generationError, setGenerationError] = useState<string | null>(null)

    const setSummary = useCallback((newSummary: SummaryResult | null) => {
        if (!strItemId) return
        queryClient.setQueryData(['summary', strItemId], newSummary)
    }, [queryClient, strItemId])

    const generate = useCallback(async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS, forceText?: string) => {
        const textToProcess = forceText || initialText
        if (!textToProcess) {
            setGenerationError("No text content to summarize")
            return
        }

        setIsGenerating(true)
        setGenerationError(null)
        try {
            const { AIServiceFactory } = await import('@/lib/ai/factory')

            const generatedText = await AIServiceFactory.generateSummary(textToProcess, options)
            const cleanedContent = formatSummaryMarkdown(generatedText)

            const result: SummaryResult = {
                id: uuidv4(),
                itemId: strItemId,
                itemType: itemType,
                courseId: courseId || null,
                content: cleanedContent,
                stats: {
                    originalWordCount: textToProcess.split(/\s+/).filter(Boolean).length,
                    summaryWordCount: cleanedContent.split(/\s+/).filter(Boolean).length,
                    compressionRatio: cleanedContent.length / (textToProcess.length || 1),
                    processingTimeMs: 0
                },
                options: options,
                createdAt: Date.now()
            }

            const saved = await saveSummary(result)
            queryClient.setQueryData(['summary', strItemId], saved || result)
            return saved || result

        } catch (e: any) {
            console.error("AI Error", e)
            setGenerationError(e.message || "Échec de la génération du résumé par l'IA.")
        } finally {
            setIsGenerating(false)
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
        remove,
        isGenerating: isGenerating || isLoadingQuery,
        error: generationError || (queryError ? (queryError as any).message : null)
    }
}

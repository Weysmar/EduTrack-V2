import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { summaryQueries } from '@/lib/api/queries'
import { SummaryOptions, SummaryResult, SummaryType, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { toast } from "sonner"

export function useSummary(itemId: string | number, itemType: SummaryType, initialText?: string) {
    const [summary, setSummary] = useState<SummaryResult | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load existing summary from API on mount
    useEffect(() => {
        const loadSummary = async () => {
            if (!itemId) return;
            try {
                // Fetch from API
                const data = await summaryQueries.getOne(String(itemId));
                if (data) {
                    setSummary(data);
                }
            } catch (e) {
                console.error("Failed to load summary", e)
            }
        }
        loadSummary()
    }, [itemId, itemType])


    const generate = useCallback(async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS, forceText?: string) => {
        const textToProcess = forceText || initialText
        if (!textToProcess) {
            setError("No text content to summarize")
            return
        }

        setIsGenerating(true)
        setError(null)
        try {
            // AI Factory Generation (Multi-Provider)
            const { AIServiceFactory } = await import('@/lib/ai/factory');

            const generatedText = await AIServiceFactory.generateSummary(textToProcess, options);

            const result: SummaryResult = {
                id: uuidv4(),
                itemId: String(itemId),
                itemType: itemType,
                content: generatedText,
                stats: {
                    originalWordCount: textToProcess.split(' ').length,
                    summaryWordCount: generatedText.split(' ').length,
                    compressionRatio: generatedText.length / textToProcess.length,
                    processingTimeMs: 0
                },
                options: options,
                createdAt: Date.now()
            };

            await saveSummary(result);
            setSummary(result);

        } catch (e: any) {
            console.error("AI Error", e)
            setError(e.message || "Échec de la génération du résumé par l'IA.")
        } finally {
            setIsGenerating(false)
        }
    }, [itemId, itemType, initialText])

    const saveSummary = async (result: SummaryResult) => {
        try {
            await summaryQueries.save(result);
            toast.success("Résumé sauvegardé avec succès")
        } catch (dbErr) {
            console.error("Failed to save summary", dbErr)
            toast.error("Erreur lors de la sauvegarde du résumé")
        }
    }

    return {
        summary,
        generate,
        isGenerating,
        error
    }
}

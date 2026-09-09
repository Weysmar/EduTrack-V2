import { SummaryOptions, DEFAULT_SUMMARY_OPTIONS, CompressionLevel, SummaryFormat } from '@/lib/summary/types'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'
import { ModelSelector } from '@/components/ModelSelector'
import { getDefaultModel } from '@/config/aiModels'
import { useAIProvider } from '@/hooks/useAIProvider'
import { X, Sliders } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/components/language-provider'
import type { FileCategory } from '@/config/aiModels'

interface SummaryOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    onGenerate: (options: SummaryOptions) => void
    initialOptions?: SummaryOptions
    fileCategory?: FileCategory
    contentLength?: number
}

export function SummaryOptionsModal({
    isOpen,
    onClose,
    onGenerate,
    initialOptions = DEFAULT_SUMMARY_OPTIONS,
    fileCategory,
    contentLength,
}: SummaryOptionsModalProps) {
    const navigate = useNavigate()
    const { getApiKey } = useProfileStore()
    const geminiKey = getApiKey('google_gemini_summaries') || getApiKey('google_gemini_exercises')
    const perplexityKey = getApiKey('perplexity_summaries') || getApiKey('perplexity_exercises')
    const initialProvider = (!perplexityKey && geminiKey) ? 'google' : 'perplexity'

    // Hook qui garantit le couplage provider ↔ modèle
    const ai = useAIProvider({
        geminiKey,
        perplexityKey,
        initialProvider: initialOptions?.provider as 'google' | 'perplexity' | undefined,
        initialModel: initialOptions?.model
    })

    const [options, setOptions] = useState<SummaryOptions>({
        ...initialOptions,
        provider: ai.provider,
        model: ai.model
    })
    const { t } = useLanguage()

    useEffect(() => {
        if (isOpen) {
            ai.reset()
            setOptions(prev => ({
                ...initialOptions,
                ...prev,
                provider: ai.provider,
                model: ai.model
            }))
        }
    }, [isOpen, initialOptions, geminiKey, perplexityKey])

    if (!isOpen) return null

    const hasKeyForSelectedProvider = ai.hasKeyForProvider

    const handleGenerate = () => {
        if (!hasKeyForSelectedProvider) {
            navigate('/settings')
            onClose()
            return
        }
        onGenerate(options)
        onClose()
    }


    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="min-h-screen px-4 text-center flex items-center justify-center">
                {/* This element is to trick the browser into centering the modal contents. */}
                <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>

                <div className="inline-block w-full max-w-md p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-card shadow-xl rounded-xl border animate-in zoom-in-95">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="font-bold flex items-center gap-2">
                            <Sliders className="h-5 w-5 text-primary" />
                            {t('summary.title')}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                            {/* Provider & Model Selection */}
                            <div className="space-y-4">
                                <ModelSelector
                                    provider={ai.provider}
                                    model={ai.model}
                                    setProvider={(p) => {
                                        ai.setProvider(p)
                                        setOptions(prev => ({ ...prev, provider: p, model: ai.model }))
                                    }}
                                    setModel={(m) => {
                                        ai.setModel(m)
                                        setOptions(prev => ({ ...prev, model: m }))
                                    }}
                                    hasKeyForProvider={ai.hasKeyForProvider}
                                    geminiKey={geminiKey}
                                    perplexityKey={perplexityKey}
                                    onClose={onClose}
                                    compact
                                    fileCategory={fileCategory}
                                    contentLength={contentLength}
                                />
                            </div>

                        {/* Compression */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold">{t('summary.compression')}</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[0.2, 0.3, 0.4, 0.5].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setOptions({ ...options, compression: level as CompressionLevel })}
                                        className={`px-2 py-3 rounded-md text-xs font-medium border transition-all min-h-[44px] touch-manipulation ${options.compression === level
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'hover:bg-accent border-muted'
                                            }`}
                                    >
                                        {level * 100}%
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground p-1">
                                {options.compression === 0.2 && t('summary.desc.20')}
                                {options.compression === 0.4 && t('summary.desc.40')}
                                {options.compression === 0.5 && t('summary.desc.50')}
                            </p>
                        </div>


                        {/* Format */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold">{t('summary.format')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['bullets', 'paragraph', 'outline', 'timeline'].map((fmt) => (
                                    <button
                                        key={fmt}
                                        onClick={() => setOptions({ ...options, format: fmt as SummaryFormat })}
                                        className={`px-3 py-3 rounded-md text-sm font-medium border capitalize min-h-[44px] touch-manipulation ${options.format === fmt
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'hover:bg-accent border-muted'
                                            }`}
                                    >
                                        {t(`summary.fmt.${fmt}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Toggles */}
                        <div className="space-y-4 pt-2 border-t">
                            <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                                <input
                                    type="checkbox"
                                    checked={options.preserveHeadings}
                                    onChange={e => setOptions({ ...options, preserveHeadings: e.target.checked })}
                                    className="rounded border-input h-5 w-5"
                                />
                                <span className="text-sm">{t('summary.preserveHeadings')}</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                                <input
                                    type="checkbox"
                                    checked={options.detectKeywords}
                                    onChange={e => setOptions({ ...options, detectKeywords: e.target.checked })}
                                    className="rounded border-input h-5 w-5"
                                />
                                <span className="text-sm">{t('summary.detectKeywords')}</span>
                            </label>
                            {options.provider === 'perplexity' && (
                                <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                                    <input
                                        type="checkbox"
                                        checked={options.useWebSearch}
                                        onChange={e => setOptions({ ...options, useWebSearch: e.target.checked })}
                                        className="rounded border-input text-primary focus:ring-primary h-5 w-5"
                                    />
                                    <span className="text-sm font-semibold flex items-center gap-1">
                                        🌐 {t('summary.useWebSearch') || "Sources Web (Perplexity)"}
                                    </span>
                                </label>
                            )}
                        </div>
                    </div >

                    <div className="p-4 border-t bg-muted/10 flex justify-end gap-2 pb-safe">
                        <button onClick={onClose} className="px-6 py-3 text-sm hover:bg-muted rounded-md min-h-[44px]">
                            {t('action.cancel')}
                        </button>
                        <button
                            onClick={handleGenerate}
                            className="px-6 py-3 text-sm bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 min-h-[44px]"
                        >
                            {t('summary.generate')}
                        </button>
                    </div>
                </div >
            </div >
        </div >
    )
}

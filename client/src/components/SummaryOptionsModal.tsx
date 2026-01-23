import { SummaryOptions, DEFAULT_SUMMARY_OPTIONS, CompressionLevel, SummaryFormat } from '@/lib/summary/types'
import { cn } from '@/lib/utils'

import { X, Sliders } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'

interface SummaryOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    onGenerate: (options: SummaryOptions) => void
    initialOptions?: SummaryOptions
}

export function SummaryOptionsModal({ isOpen, onClose, onGenerate, initialOptions = DEFAULT_SUMMARY_OPTIONS }: SummaryOptionsModalProps) {
    const [options, setOptions] = useState<SummaryOptions>(initialOptions)
    const { t } = useLanguage()

    if (!isOpen) return null

    const handleGenerate = () => {
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
                            <div className="space-y-3">
                                <label className="text-sm font-semibold">Moteur de Résumé</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setOptions({ ...options, provider: 'perplexity', model: 'sonar-pro' })}
                                        className={cn(
                                            "px-3 py-3 rounded-md text-sm font-medium border flex items-center justify-center gap-2 min-h-[44px] touch-manipulation",
                                            options.provider === 'perplexity'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'hover:bg-accent border-muted'
                                        )}
                                    >
                                        🤖 Perplexity Pro
                                    </button>
                                    <button
                                        onClick={() => setOptions({ ...options, provider: 'google', model: 'gemini-2.0-flash-exp' })}
                                        className={cn(
                                            "px-3 py-3 rounded-md text-sm font-medium border flex items-center justify-center gap-2 min-h-[44px] touch-manipulation",
                                            options.provider === 'google'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'hover:bg-accent border-muted'
                                        )}
                                    >
                                        ⚡ Google Gemini
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Modèle</label>
                                <select
                                    value={options.model || (options.provider === 'perplexity' ? 'sonar-pro' : 'gemini-2.0-flash-exp')}
                                    onChange={(e) => setOptions({ ...options, model: e.target.value })}
                                    className="w-full bg-background border px-3 py-3 rounded-md text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                                >
                                    {options.provider === 'perplexity' ? (
                                        <>
                                            <option value="sonar-deep-research">🐋 Sonar Deep Research (Recherche Profonde)</option>
                                            <option value="sonar-reasoning-pro">🧠 Sonar Reasoning Pro (Raisonnement)</option>
                                            <option value="sonar-pro">🤖 Sonar Pro (Standard)</option>
                                            <option value="sonar">🚀 Sonar (Rapide)</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="gemini-2.0-flash-exp">🚀 Gemini 2.0 Flash-Exp (Recommandé)</option>
                                            <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro (Intelligence Max)</option>
                                            <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash (Expérimental)</option>
                                            <option value="gemini-2.0-flash-lite">🔥 Gemini 2.0 Flash-Lite (Ultra-rapide)</option>
                                        </>
                                    )}
                                </select>
                            </div>
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

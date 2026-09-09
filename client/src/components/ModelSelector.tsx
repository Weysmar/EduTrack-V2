/**
 * ModelSelector — Composant stateless de sélection provider + modèle IA.
 *
 * Affiche les boutons provider et le <select> de modèles.
 * Toute la logique de couplage provider ↔ modèle est gérée par le hook
 * `useAIProvider` — ce composant est purement d'affichage.
 *
 * Usage avec le hook :
 *   const ai = useAIProvider({ geminiKey, perplexityKey })
 *   <ModelSelector {...ai} onClose={onClose} />
 */

import { AlertCircle, Zap, Globe, AlertTriangle, Eye, EyeOff, Brain, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    getModelsForProvider,
    getModelById,
    validateFileModelCompatibility,
    checkContextFit,
    type AIProvider,
    type FileCategory
} from '@/config/aiModels'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
    provider: AIProvider
    model: string
    /** Appelé quand l'utilisateur change de provider — délégué au hook useAIProvider */
    setProvider: (provider: AIProvider) => void
    /** Appelé quand l'utilisateur change de modèle — délégué au hook useAIProvider */
    setModel: (model: string) => void
    /** Vrai si une clé est disponible pour le provider courant (fourni par useAIProvider) */
    hasKeyForProvider: boolean
    geminiKey: string | null | undefined
    perplexityKey: string | null | undefined
    /** Ferme le modal parent avant de naviguer vers les paramètres */
    onClose?: () => void
    /** Variante visuelle compacte (pour SummaryOptionsModal) */
    compact?: boolean
    /** Type/catégorie de fichier pour la validation de compatibilité */
    fileCategory?: FileCategory
    /** Longueur du contenu source en caractères pour vérifier le dépassement de contexte */
    contentLength?: number
}

export function ModelSelector({
    provider,
    model,
    setProvider,
    setModel,
    hasKeyForProvider,
    geminiKey,
    perplexityKey,
    onClose,
    compact = false,
    fileCategory,
    contentLength,
}: ModelSelectorProps) {
    const navigate = useNavigate()
    const models = getModelsForProvider(provider)
    const activeModelEntry = getModelById(model)

    // Vérification de compatibilité de fichier (ex: image ↔ vision)
    const fileCompat = fileCategory ? validateFileModelCompatibility(fileCategory, model) : { compatible: true }

    // Vérification de la fenêtre de contexte si la longueur du texte est fournie
    const contextCheck = contentLength && contentLength > 0 ? checkContextFit(contentLength, model) : null

    return (
        <div className="space-y-3">
            {/* Sélection du provider */}
            <div>
                <label className="block text-sm font-medium mb-2">Moteur IA</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setProvider('google')}
                        disabled={!geminiKey}
                        className={cn(
                            'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all min-h-[44px] touch-manipulation',
                            provider === 'google'
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'hover:bg-muted border-border',
                            !geminiKey && 'opacity-40 cursor-not-allowed'
                        )}
                    >
                        <Zap className="h-4 w-4 shrink-0" />
                        <span>Google Gemini</span>
                        {!geminiKey && <span className="text-xs opacity-70">(clé manquante)</span>}
                    </button>

                    <button
                        type="button"
                        onClick={() => setProvider('perplexity')}
                        disabled={!perplexityKey}
                        className={cn(
                            'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all min-h-[44px] touch-manipulation',
                            provider === 'perplexity'
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'hover:bg-muted border-border',
                            !perplexityKey && 'opacity-40 cursor-not-allowed'
                        )}
                    >
                        <Globe className="h-4 w-4 shrink-0" />
                        <span>Perplexity</span>
                        {!perplexityKey && <span className="text-xs opacity-70">(clé manquante)</span>}
                    </button>
                </div>

                {/* Alerte clé manquante */}
                {!hasKeyForProvider && (
                    <div className={cn(
                        'mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300',
                        'p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs animate-in fade-in'
                    )}>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                            <span className="truncate">
                                Clé API manquante pour {provider === 'google' ? 'Google Gemini' : 'Perplexity'}.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onClose?.()
                                navigate('/settings')
                            }}
                            className="font-semibold underline hover:text-amber-950 dark:hover:text-amber-100 shrink-0 text-xs"
                        >
                            Paramètres ↗
                        </button>
                    </div>
                )}
            </div>

            {/* Sélection du modèle — liste dérivée dynamiquement du registre */}
            <div>
                <label className={cn('block mb-1', compact ? 'text-xs text-muted-foreground' : 'text-sm font-medium')}>
                    Version du modèle
                </label>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    {models.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.displayName}
                        </option>
                    ))}
                </select>

                {/* Badges des capacités du modèle sélectionné */}
                {activeModelEntry && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border/50">
                            ⚡ {activeModelEntry.maxTokens >= 1_000_000 ? `${(activeModelEntry.maxTokens / 1_000_000).toFixed(1)}M` : `${(activeModelEntry.maxTokens / 1000).toFixed(0)}k`} tokens
                        </span>
                        {activeModelEntry.capabilities.vision ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                <Eye className="h-3 w-3" /> Vision native
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground border border-border/40">
                                <EyeOff className="h-3 w-3" /> OCR texte
                            </span>
                        )}
                        {activeModelEntry.capabilities.reasoning && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                <Brain className="h-3 w-3" /> Raisonnement
                            </span>
                        )}
                        {activeModelEntry.capabilities.webSearch && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <Globe className="h-3 w-3" /> Web
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Avertissement d'incompatibilité fichier ↔ modèle (ex: image sur modèle sans vision) */}
            {!fileCompat.compatible && fileCompat.warning && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>{fileCompat.warning}</span>
                </div>
            )}

            {/* Avertissement de dépassement de la fenêtre de contexte (tokens estimés) */}
            {contextCheck && !contextCheck.fits && contextCheck.warning && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                    <span>{contextCheck.warning}</span>
                </div>
            )}
        </div>
    )
}

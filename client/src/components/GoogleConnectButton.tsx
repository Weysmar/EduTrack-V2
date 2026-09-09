import React, { useState, useEffect } from 'react'
import { 
    Calendar, Check, Link2, ExternalLink, AlertCircle, Loader2, X, Trash2,
    Copy, RefreshCw, ArrowUpFromLine, ArrowDownToLine, Sparkles, ShieldAlert
} from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'
import { useProfileStore } from '@/store/profileStore'
import { useLanguage } from '@/components/language-provider'
import { fetchICalFeed } from '@/lib/ical-parser'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarQueries } from '@/lib/api/queries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function GoogleConnectButton() {
    const { t, language } = useLanguage()
    const queryClient = useQueryClient()
    const { icalUrl: storeUrl, setUrl: setStoreUrl, disconnect: storeDisconnect } = useCalendarStore()
    const { apiKeys, setApiKey } = useProfileStore()

    const currentUrl = apiKeys.google_calendar || storeUrl || ''
    const isConnected = !!currentUrl

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
    const [urlInput, setUrlInput] = useState(currentUrl)
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [hasCopied, setHasCopied] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number } | null>(null)

    // Fetch user's personal EduTrack iCal feed info
    const { data: feedInfo, isLoading: isLoadingFeed, refetch: refetchFeed } = useQuery({
        queryKey: ['calendarFeedInfo'],
        queryFn: calendarQueries.getFeedInfo,
        enabled: isModalOpen,
        staleTime: 1000 * 60 * 5
    });

    const regenerateMutation = useMutation({
        mutationFn: calendarQueries.regenerateFeed,
        onSuccess: (data) => {
            queryClient.setQueryData(['calendarFeedInfo'], data);
            toast.success(language === 'fr' ? 'Nouveau lien iCal généré avec succès !' : 'New iCal link generated successfully!');
        },
        onError: () => {
            toast.error(language === 'fr' ? 'Échec de la régénération' : 'Failed to regenerate link');
        }
    });

    useEffect(() => {
        if (isModalOpen) {
            setUrlInput(currentUrl)
            setTestResult(null)
            setHasCopied(false)
        }
    }, [isModalOpen, currentUrl])

    const handleCopyFeed = async () => {
        if (!feedInfo?.feedUrl) return
        try {
            await navigator.clipboard.writeText(feedInfo.feedUrl)
            setHasCopied(true)
            toast.success(language === 'fr' ? 'Lien d\'agenda copié dans le presse-papier !' : 'Calendar link copied to clipboard!')
            setTimeout(() => setHasCopied(false), 2500)
        } catch (err) {
            console.error('Failed to copy', err)
            toast.error(language === 'fr' ? 'Erreur lors de la copie' : 'Failed to copy')
        }
    }

    const handleTest = async () => {
        if (!urlInput.trim()) {
            setTestResult({
                success: false,
                message: language === 'fr' ? 'Veuillez saisir une URL iCal' : 'Please enter an iCal URL'
            })
            return
        }

        setIsTesting(true)
        setTestResult(null)

        try {
            const events = await fetchICalFeed(urlInput.trim())
            setTestResult({
                success: true,
                message: language === 'fr'
                    ? `Connexion réussie ! ${events.length} événement(s) récupéré(s).`
                    : `Connection successful! ${events.length} event(s) found.`,
                count: events.length
            })
        } catch (error: any) {
            console.error('Test iCal error:', error)
            const detail = error.response?.data?.error || error.message || ''
            setTestResult({
                success: false,
                message: language === 'fr'
                    ? `Impossible de charger l'agenda : ${detail || 'Vérifiez le lien iCal'}`
                    : `Failed to load calendar: ${detail || 'Check the iCal link'}`
            })
        } finally {
            setIsTesting(false)
        }
    }

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = urlInput.trim()
        if (!trimmed) return

        setIsSaving(true)
        try {
            // Normalize webcal:// to https://
            let cleanUrl = trimmed
            if (cleanUrl.startsWith('webcal://')) {
                cleanUrl = 'https://' + cleanUrl.substring(9)
            } else if (cleanUrl.startsWith('webcals://')) {
                cleanUrl = 'https://' + cleanUrl.substring(10)
            }

            // Save in Profile & Calendar store
            await setApiKey('google_calendar', cleanUrl)
            setStoreUrl(cleanUrl)
            toast.success(language === 'fr' ? 'Agenda Google connecté avec succès !' : 'Google Calendar connected successfully!')
            setIsModalOpen(false)
        } catch (error) {
            console.error('Error saving calendar url:', error)
            toast.error(language === 'fr' ? 'Erreur lors de l\'enregistrement' : 'Error saving calendar')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDisconnect = async () => {
        setIsSaving(true)
        try {
            await setApiKey('google_calendar', '')
            storeDisconnect()
            setUrlInput('')
            toast.success(language === 'fr' ? 'Agenda déconnecté' : 'Calendar disconnected')
            setIsModalOpen(false)
        } catch (error) {
            console.error('Error disconnecting calendar:', error)
        } finally {
            setIsSaving(false)
        }
    }

    // Google Calendar direct webcal subscription URL
    const googleSubscribeUrl = feedInfo?.webcalUrl
        ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedInfo.webcalUrl)}`
        : ''

    return (
        <>
            {isConnected ? (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-500 border border-green-500/30 rounded-full text-xs sm:text-sm font-medium transition-all"
                    title={language === 'fr' ? 'Google Agenda connecté (cliquer pour gérer)' : 'Google Calendar connected (click to manage)'}
                >
                    <Check className="h-3.5 w-3.5" />
                    <span>{t('calendar.connected') || 'Agenda connecté'}</span>
                </button>
            ) : (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-sm rounded-full transition-all text-xs sm:text-sm font-medium"
                >
                    <Calendar className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Synchroniser Google Agenda' : 'Sync Google Calendar'}</span>
                </button>
            )}

            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border text-card-foreground w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b bg-muted/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {language === 'fr' ? 'Synchronisation Google Agenda' : 'Google Calendar Sync'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'fr' ? 'Synchronisez vos exercices, révisions et cours' : 'Sync your exercises, revisions, and classes'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Tabs Switcher */}
                        <div className="grid grid-cols-2 p-1.5 bg-muted/50 border-b text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setActiveTab('export')}
                                className={cn(
                                    "py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5",
                                    activeTab === 'export'
                                        ? "bg-background text-foreground shadow-sm font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ArrowUpFromLine className="h-3.5 w-3.5 text-emerald-500" />
                                <span>{language === 'fr' ? 'EduTrack ➔ Google Agenda' : 'EduTrack ➔ Google Calendar'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('import')}
                                className={cn(
                                    "py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5",
                                    activeTab === 'import'
                                        ? "bg-background text-foreground shadow-sm font-bold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ArrowDownToLine className="h-3.5 w-3.5 text-blue-500" />
                                <span>{language === 'fr' ? 'Google Agenda ➔ EduTrack' : 'Google Calendar ➔ EduTrack'}</span>
                            </button>
                        </div>

                        {/* TAB 1: EXPORT EDUTRACK TO GOOGLE CALENDAR */}
                        {activeTab === 'export' && (
                            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
                                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-sm">
                                        <Sparkles className="h-4 w-4 shrink-0" />
                                        <span>
                                            {language === 'fr' ? 'Abonnement automatique iCal' : 'Automatic iCal Subscription'}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {language === 'fr'
                                            ? 'Google Agenda récupère automatiquement tous vos exercices avec échéance, révisions, partiels et plannings créés dans EduTrack. Aucune action manuelle future n\'est nécessaire !'
                                            : 'Google Calendar automatically fetches all your exercises with deadlines, revisions, exams, and study plans created in EduTrack. No manual export needed!'}
                                    </p>
                                </div>

                                {/* 1-Click Action Button */}
                                {isLoadingFeed ? (
                                    <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span>{language === 'fr' ? 'Génération de votre flux iCal...' : 'Generating your iCal feed...'}</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {googleSubscribeUrl && (
                                            <a
                                                href={googleSubscribeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm active:scale-[0.99]"
                                            >
                                                <Calendar className="h-4 w-4" />
                                                <span>{language === 'fr' ? "Ajouter à Google Agenda en 1 clic" : "Add to Google Calendar in 1 click"}</span>
                                                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                                            </a>
                                        )}

                                        {/* Feed URL input & Copy */}
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                                <span>{language === 'fr' ? 'Ou copiez votre lien d\'abonnement iCal :' : 'Or copy your iCal subscription link:'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => regenerateMutation.mutate()}
                                                    disabled={regenerateMutation.isPending}
                                                    className="text-[11px] text-muted-foreground hover:text-foreground underline flex items-center gap-1 transition-colors"
                                                    title={language === 'fr' ? 'Régénérer le lien et révoquer l\'ancien' : 'Regenerate link'}
                                                >
                                                    <RefreshCw className={cn("h-3 w-3", regenerateMutation.isPending && "animate-spin")} />
                                                    <span>{language === 'fr' ? 'Régénérer' : 'Regenerate'}</span>
                                                </button>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={feedInfo?.feedUrl || ''}
                                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs font-mono outline-none text-muted-foreground focus:text-foreground"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCopyFeed}
                                                    className={cn(
                                                        "px-3.5 py-2 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 shrink-0 shadow-xs",
                                                        hasCopied
                                                            ? "bg-emerald-500 text-white border-emerald-500"
                                                            : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                                                    )}
                                                >
                                                    {hasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                    <span>{hasCopied ? (language === 'fr' ? 'Copié !' : 'Copied!') : (language === 'fr' ? 'Copier' : 'Copy')}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Step-by-Step Instructions */}
                                        <div className="bg-muted/40 border rounded-xl p-3.5 text-xs space-y-2 text-muted-foreground">
                                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                                                <span>{language === 'fr' ? 'Comment ajouter ce flux dans Google Agenda :' : 'How to add this feed in Google Calendar:'}</span>
                                            </div>
                                            <ol className="list-decimal list-inside space-y-1 pl-1">
                                                <li>{language === 'fr' ? 'Ouvrez Google Agenda sur votre ordinateur.' : 'Open Google Calendar on your computer.'}</li>
                                                <li>{language === 'fr' ? 'À gauche, cliquez sur le "+" à côté de « Autres agendas ».' : 'On the left, click the "+" next to "Other calendars".'}</li>
                                                <li>{language === 'fr' ? 'Choisissez « À partir de l\'URL ».' : 'Choose "From URL".'}</li>
                                                <li>{language === 'fr' ? 'Collez ce lien et cliquez sur « Ajouter un agenda ».' : 'Paste this link and click "Add calendar".'}</li>
                                            </ol>
                                            <p className="text-[11px] italic pt-1 text-muted-foreground/80">
                                                💡 {language === 'fr' 
                                                    ? 'Fonctionne également avec Apple Calendar (Mac/iPhone) et Microsoft Outlook.' 
                                                    : 'Also works with Apple Calendar (Mac/iPhone) and Microsoft Outlook.'}
                                            </p>
                                            <div className="pt-2 border-t border-border/50 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg flex items-start gap-1.5">
                                                <span className="shrink-0 font-bold">⚠️</span>
                                                <span>
                                                    {language === 'fr'
                                                        ? 'Délai de mise à jour Google : Google Agenda actualise automatiquement les flux externes toutes les quelques heures. Pour forcer l\'affichage immédiat de nouvelles échéances sans attendre, cliquez sur « Régénérer » ci-dessus puis ajoutez le nouveau lien dans Google Agenda.'
                                                        : 'Google update delay: Google Calendar checks external feeds automatically every few hours. To force an immediate update of newly added deadlines, click "Regenerate" above and add the new link in Google Calendar.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-3 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                                    >
                                        {language === 'fr' ? 'Terminé' : 'Done'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: IMPORT FROM GOOGLE CALENDAR (EXISTING FLOW) */}
                        {activeTab === 'import' && (
                            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Link2 className="h-4 w-4 text-primary" />
                                        <span>{language === 'fr' ? 'Adresse secrète au format iCal de Google (.ics)' : 'Secret iCal Feed URL from Google (.ics)'}</span>
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-xs"
                                        autoFocus
                                    />
                                </div>

                                {/* Test & Actions buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleTest}
                                        disabled={isTesting || !urlInput.trim()}
                                        className="px-3.5 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                        {language === 'fr' ? 'Tester le lien' : 'Test connection'}
                                    </button>
                                </div>

                                {/* Test feedback */}
                                {testResult && (
                                    <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                                        testResult.success
                                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                                    }`}>
                                        {testResult.success ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}

                                {/* Tutorial guide */}
                                <div className="bg-muted/50 border rounded-xl p-4 text-xs space-y-2.5 text-muted-foreground">
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                                        <span>{language === 'fr' ? 'Comment obtenir votre lien Google Agenda :' : 'How to get your Google Calendar link:'}</span>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 pl-1">
                                        <li>{language === 'fr' ? 'Ouvrez Google Agenda sur votre ordinateur.' : 'Open Google Calendar on your computer.'}</li>
                                        <li>{language === 'fr' ? 'À gauche, survolez votre agenda, cliquez sur les 3 points puis "Paramètres et partage".' : 'On the left, hover over your calendar, click 3 dots and "Settings and sharing".'}</li>
                                        <li>{language === 'fr' ? 'Descendez jusqu\'à la section "Intégrer l\'agenda".' : 'Scroll down to the "Integrate calendar" section.'}</li>
                                        <li>{language === 'fr' ? 'Copiez le lien "Adresse secrète au format iCal".' : 'Copy the "Secret address in iCal format" link.'}</li>
                                    </ol>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex items-center justify-between pt-3 border-t mt-4">
                                    {isConnected ? (
                                        <button
                                            type="button"
                                            onClick={handleDisconnect}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {language === 'fr' ? 'Déconnecter' : 'Disconnect'}
                                        </button>
                                    ) : <div />}

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                                        >
                                            {t('action.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving || !urlInput.trim()}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                            {language === 'fr' ? 'Enregistrer l\'agenda' : 'Save Calendar'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

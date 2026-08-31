import React, { useState, useEffect } from 'react'
import { Calendar, Check, Link2, ExternalLink, AlertCircle, Loader2, X, Trash2 } from 'lucide-react'
import { useCalendarStore } from '@/store/calendarStore'
import { useProfileStore } from '@/store/profileStore'
import { useLanguage } from '@/components/language-provider'
import { fetchICalFeed } from '@/lib/ical-parser'
import { createPortal } from 'react-dom'

export function GoogleConnectButton() {
    const { t, language } = useLanguage()
    const { icalUrl: storeUrl, setUrl: setStoreUrl, disconnect: storeDisconnect } = useCalendarStore()
    const { apiKeys, setApiKey } = useProfileStore()

    const currentUrl = apiKeys.google_calendar || storeUrl || ''
    const isConnected = !!currentUrl

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [urlInput, setUrlInput] = useState(currentUrl)
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number } | null>(null)

    useEffect(() => {
        if (isModalOpen) {
            setUrlInput(currentUrl)
            setTestResult(null)
        }
    }, [isModalOpen, currentUrl])

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
            setIsModalOpen(false)
        } catch (error) {
            console.error('Error saving calendar url:', error)
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
            setIsModalOpen(false)
        } catch (error) {
            console.error('Error disconnecting calendar:', error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            {isConnected ? (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-500 border border-green-500/30 rounded-full text-xs sm:text-sm font-medium transition-all"
                    title={language === 'fr' ? 'Google Agenda connecté (cliquer pour modifier)' : 'Google Calendar connected (click to edit)'}
                >
                    <Check className="h-3.5 w-3.5" />
                    <span>{t('calendar.connected')}</span>
                </button>
            ) : (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-sm rounded-full transition-all text-xs sm:text-sm font-medium"
                >
                    <Calendar className="h-4 w-4" />
                    <span>{t('calendar.connect')}</span>
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
                                        {language === 'fr' ? 'Intégrez votre planning via le flux iCal' : 'Integrate your schedule using iCal feed'}
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

                        {/* Body */}
                        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-primary" />
                                    <span>{language === 'fr' ? 'Adresse secrète au format iCal (.ics)' : 'Secret iCal Feed URL (.ics)'}</span>
                                </label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                                    {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCwIcon className="h-3.5 w-3.5" />}
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
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

function RefreshCwIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
        </svg>
    )
}

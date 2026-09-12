import React, { useState, useEffect } from 'react'
import { 
    Calendar, Check, Link2, ExternalLink, AlertCircle, Loader2, X, Trash2,
    Copy, RefreshCw, ArrowUpFromLine, ArrowDownToLine, Sparkles, ShieldCheck,
    Plus, Eye, EyeOff, CheckCircle2, Pencil, Palette
} from 'lucide-react'
import { useCalendarStore, DEFAULT_CALENDAR_COLORS, EXTENDED_CALENDAR_COLORS, type ICalFeed } from '@/store/calendarStore'
import { EditCalendarModal } from '@/components/EditCalendarModal'
import { useProfileStore } from '@/store/profileStore'
import { useLanguage } from '@/components/language-provider'
import { fetchICalFeed } from '@/lib/ical-parser'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarQueries } from '@/lib/api/queries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface GoogleConnectButtonProps {
    className?: string;
    variant?: 'default' | 'compact';
}

export function GoogleConnectButton({ className, variant = 'default' }: GoogleConnectButtonProps = {}) {
    const { t, language } = useLanguage()
    const queryClient = useQueryClient()
    const { 
        feeds, 
        addFeed, 
        removeFeed, 
        toggleFeed, 
        updateFeed, 
        icalUrl: storeUrl,
        isConnected: storeConnected
    } = useCalendarStore()
    const { apiKeys, setApiKey } = useProfileStore()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')
    
    // New feed form state
    const [newFeedName, setNewFeedName] = useState('')
    const [newFeedUrl, setNewFeedUrl] = useState('')
    const [newFeedColor, setNewFeedColor] = useState(DEFAULT_CALENDAR_COLORS[0])
    const [isTestingNew, setIsTestingNew] = useState(false)
    const [testingFeedId, setTestingFeedId] = useState<string | null>(null)
    const [feedCounts, setFeedCounts] = useState<Record<string, number>>({})
    const [hasCopied, setHasCopied] = useState(false)
    const [showAddForm, setShowAddForm] = useState(feeds.length === 0)
    const [editingFeed, setEditingFeed] = useState<ICalFeed | null>(null)

    // Fetch user's personal EduTrack iCal feed info (Export tab)
    const { data: feedInfo, isLoading: isLoadingFeed } = useQuery({
        queryKey: ['calendarFeedInfo'],
        queryFn: calendarQueries.getFeedInfo,
        enabled: isModalOpen && activeTab === 'export',
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

    // Auto open add form if no feeds
    useEffect(() => {
        if (isModalOpen && feeds.length === 0) {
            setShowAddForm(true)
        }
    }, [isModalOpen, feeds.length])

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

    const normalizeUrl = (raw: string) => {
        let clean = raw.trim();
        if (clean.startsWith('webcal://')) {
            clean = 'https://' + clean.substring(9);
        } else if (clean.startsWith('webcals://')) {
            clean = 'https://' + clean.substring(10);
        }
        return clean;
    }

    const handleAddFeed = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const cleanUrl = normalizeUrl(newFeedUrl);
        if (!cleanUrl) return;

        setIsTestingNew(true);
        try {
            const events = await fetchICalFeed(cleanUrl);
            const name = newFeedName.trim() || (language === 'fr' ? `Agenda ${feeds.length + 1}` : `Calendar ${feeds.length + 1}`);
            
            const newId = addFeed({
                name,
                url: cleanUrl,
                color: newFeedColor,
                enabled: true,
            });

            // Update legacy apiKeys.google_calendar for backwards compatibility
            await setApiKey('google_calendar', cleanUrl);

            setFeedCounts(prev => ({ ...prev, [newId]: events.length }));
            setNewFeedName('');
            setNewFeedUrl('');
            setNewFeedColor(DEFAULT_CALENDAR_COLORS[(feeds.length + 1) % DEFAULT_CALENDAR_COLORS.length]);
            setShowAddForm(false);
            
            toast.success(
                language === 'fr'
                    ? `Agenda « ${name} » connecté (${events.length} événements) !`
                    : `Calendar "${name}" connected (${events.length} events)!`
            );
        } catch (err: any) {
            console.error('[GoogleConnectButton] Add feed error:', err);
            const detail = err.response?.data?.error || err.message || '';
            toast.error(
                language === 'fr'
                    ? `Impossible de charger l'agenda : ${detail || 'Vérifiez le lien iCal'}`
                    : `Failed to load calendar: ${detail || 'Check the iCal link'}`
            );
        } finally {
            setIsTestingNew(false);
        }
    };

    const handleTestExisting = async (feed: ICalFeed) => {
        setTestingFeedId(feed.id);
        try {
            const events = await fetchICalFeed(feed.url);
            setFeedCounts(prev => ({ ...prev, [feed.id]: events.length }));
            toast.success(
                language === 'fr'
                    ? `« ${feed.name} » : ${events.length} événement(s) récupéré(s) avec succès !`
                    : `"${feed.name}": ${events.length} event(s) fetched successfully!`
            );
        } catch (err: any) {
            const detail = err.response?.data?.error || err.message || '';
            toast.error(
                language === 'fr'
                    ? `Erreur sur « ${feed.name} » : ${detail || 'Vérifiez le lien'}`
                    : `Error on "${feed.name}": ${detail || 'Check the link'}`
            );
        } finally {
            setTestingFeedId(null);
        }
    };

    const handleRemoveFeed = async (feed: ICalFeed) => {
        removeFeed(feed.id);
        const remaining = feeds.filter(f => f.id !== feed.id);
        if (remaining.length > 0) {
            await setApiKey('google_calendar', remaining[0].url);
        } else {
            await setApiKey('google_calendar', '');
        }
        toast.info(language === 'fr' ? `Agenda « ${feed.name} » retiré.` : `Calendar "${feed.name}" removed.`);
    };

    // Active feeds count
    const activeFeedsCount = feeds.filter(f => f.enabled).length;
    const isConnected = activeFeedsCount > 0 || !!apiKeys.google_calendar || storeConnected;

    // Google Calendar direct webcal subscription URL
    const googleSubscribeUrl = feedInfo?.webcalUrl
        ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedInfo.webcalUrl)}`
        : ''

    return (
        <>
            {variant === 'compact' ? (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border transition-colors shadow-xs shrink-0",
                        isConnected
                            ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "border-border bg-background hover:bg-muted text-foreground",
                        className
                    )}
                    title={language === 'fr' ? 'Gérer les agendas synchronisés (iCal)' : 'Manage synchronized calendars (iCal)'}
                >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                        {isConnected 
                            ? `${activeFeedsCount} ${language === 'fr' ? 'agenda(s)' : 'cal(s)'}`
                            : (language === 'fr' ? 'Agendas' : 'Calendars')}
                    </span>
                </button>
            ) : isConnected ? (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs sm:text-sm font-medium transition-all",
                        className
                    )}
                    title={language === 'fr' ? 'Gérer les agendas connectés' : 'Manage connected calendars'}
                >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>
                        {feeds.length > 1
                            ? `${activeFeedsCount}/${feeds.length} ${language === 'fr' ? 'agendas' : 'calendars'}`
                            : (feeds[0]?.name || (language === 'fr' ? 'Agenda connecté' : 'Calendar connected'))}
                    </span>
                </button>
            ) : (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-xs rounded-full transition-all text-xs sm:text-sm font-medium",
                        className
                    )}
                >
                    <Calendar className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Connecter un agenda (iCal)' : 'Connect calendar (iCal)'}</span>
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
                                        {language === 'fr' ? 'Gestion des Agendas (iCal)' : 'Calendar Management (iCal)'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'fr' ? 'Connectez l\'emploi du temps de votre promo et vos agendas personnels' : 'Connect school timetable and personal calendars'}
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

                        {/* Navigation Tabs */}
                        <div className="flex border-b bg-muted/20 px-5 pt-2 gap-2 text-xs font-medium">
                            <button
                                type="button"
                                onClick={() => setActiveTab('import')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2.5 border-b-2 transition-all",
                                    activeTab === 'import'
                                        ? "border-primary text-primary font-semibold"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ArrowDownToLine className="h-3.5 w-3.5" />
                                <span>{language === 'fr' ? `Agendas externes (${feeds.length})` : `External feeds (${feeds.length})`}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('export')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2.5 border-b-2 transition-all",
                                    activeTab === 'export'
                                        ? "border-primary text-primary font-semibold"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ArrowUpFromLine className="h-3.5 w-3.5" />
                                <span>{language === 'fr' ? 'Exporter vers Google / Apple' : 'Export to Google / Apple'}</span>
                            </button>
                        </div>

                        {/* TAB 1: EXTERNAL FEEDS (MULTI-ICAL IMPORT) */}
                        {activeTab === 'import' && (
                            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                {/* Read-only safety badge */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-start gap-2.5">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <div className="leading-relaxed">
                                        <span className="font-semibold">{language === 'fr' ? 'Lecture seule garantie :' : 'Read-only guaranteed:'} </span>
                                        {language === 'fr'
                                            ? 'EduTrack lit uniquement les événements de vos liens iCal sans jamais écrire ni modifier vos calendriers externes. Aucun événement personnel EduTrack n\'est partagé avec vos camarades de promo.'
                                            : 'EduTrack only reads events from your iCal links and never writes to or alters your external calendars. No personal EduTrack tasks are ever sent to your school shared calendar.'}
                                    </div>
                                </div>

                                {/* List of registered feeds */}
                                {feeds.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {language === 'fr' ? 'Mes agendas connectés' : 'Connected calendars'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {activeFeedsCount} {language === 'fr' ? 'actif(s)' : 'active'}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {feeds.map((feed) => {
                                                const count = feedCounts[feed.id];
                                                return (
                                                    <div
                                                        key={feed.id}
                                                        className={cn(
                                                            "p-3 rounded-xl border transition-all flex items-center justify-between gap-3 bg-card",
                                                            feed.enabled ? "border-border shadow-xs" : "opacity-60 bg-muted/30 border-dashed"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            {/* Color indicator / picker */}
                                                            <button 
                                                                type="button"
                                                                onClick={() => setEditingFeed(feed)}
                                                                className="w-4 h-4 rounded-full shrink-0 shadow-xs ring-2 ring-background hover:scale-125 transition-transform cursor-pointer" 
                                                                style={{ backgroundColor: feed.color || '#3b82f6' }}
                                                                title={language === 'fr' ? 'Changer la couleur ou renommer' : 'Change color or rename'}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingFeed(feed)}
                                                                        className="font-medium text-xs truncate text-foreground hover:text-primary transition-colors text-left cursor-pointer"
                                                                        title={language === 'fr' ? 'Renommer ou changer la couleur' : 'Rename or change color'}
                                                                    >
                                                                        {feed.name}
                                                                    </button>
                                                                    {count !== undefined && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                                                            {count} {language === 'fr' ? 'évts' : 'events'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] font-mono text-muted-foreground truncate">
                                                                    {feed.url}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Feed actions */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {/* Edit button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingFeed(feed)}
                                                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors text-xs cursor-pointer"
                                                                title={language === 'fr' ? 'Renommer ou changer la couleur' : 'Rename or change color'}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>

                                                            {/* Test button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTestExisting(feed)}
                                                                disabled={testingFeedId === feed.id}
                                                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors text-xs"
                                                                title={language === 'fr' ? 'Tester / rafraîchir ce flux' : 'Test / refresh feed'}
                                                            >
                                                                <RefreshCw className={cn("h-3.5 w-3.5", testingFeedId === feed.id && "animate-spin text-primary")} />
                                                            </button>

                                                            {/* Toggle enabled / disabled */}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleFeed(feed.id)}
                                                                className={cn(
                                                                    "p-1.5 rounded-lg transition-colors text-xs",
                                                                    feed.enabled 
                                                                        ? "text-primary hover:bg-primary/10" 
                                                                        : "text-muted-foreground hover:bg-muted"
                                                                )}
                                                                title={feed.enabled 
                                                                    ? (language === 'fr' ? 'Masquer du calendrier' : 'Hide from calendar') 
                                                                    : (language === 'fr' ? 'Afficher dans le calendrier' : 'Show in calendar')}
                                                            >
                                                                {feed.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                            </button>

                                                            {/* Delete button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFeed(feed)}
                                                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title={language === 'fr' ? 'Supprimer cet agenda' : 'Delete this feed'}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Add New Feed Section / Form */}
                                {!showAddForm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full py-2.5 px-3 border border-dashed border-primary/40 text-primary hover:bg-primary/5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>{language === 'fr' ? 'Ajouter un autre agenda iCal' : 'Add another iCal calendar'}</span>
                                    </button>
                                )}

                                {showAddForm && (
                                    <form onSubmit={handleAddFeed} className="p-4 border rounded-xl bg-muted/20 space-y-3 animate-in fade-in">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                                                <Plus className="h-3.5 w-3.5 text-primary" />
                                                {language === 'fr' ? 'Nouvel agenda externe' : 'New external calendar'}
                                            </span>
                                            {feeds.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddForm(false)}
                                                    className="text-xs text-muted-foreground hover:text-foreground"
                                                >
                                                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Name input */}
                                        <div>
                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                                {language === 'fr' ? 'Nom de l\'agenda' : 'Calendar name'}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={language === 'fr' ? 'Ex : Emploi du temps Promo, Perso, Job...' : 'Ex: School Timetable, Personal, Work...'}
                                                value={newFeedName}
                                                onChange={(e) => setNewFeedName(e.target.value)}
                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>

                                        {/* URL input */}
                                        <div>
                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                                {language === 'fr' ? 'Lien secret iCal (.ics ou webcal://)' : 'Secret iCal URL (.ics or webcal://)'}
                                            </label>
                                            <input
                                                type="url"
                                                required
                                                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                                                value={newFeedUrl}
                                                onChange={(e) => setNewFeedUrl(e.target.value)}
                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>

                                        {/* Color picker presets + custom color */}
                                        <div>
                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                                                {language === 'fr' ? 'Couleur d\'identification' : 'Badge color'}
                                            </label>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {EXTENDED_CALENDAR_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => setNewFeedColor(color)}
                                                        className={cn(
                                                            "w-6 h-6 rounded-full transition-transform flex items-center justify-center shadow-xs cursor-pointer",
                                                            newFeedColor.toLowerCase() === color.toLowerCase() ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-110"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {newFeedColor.toLowerCase() === color.toLowerCase() && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                                                    </button>
                                                ))}

                                                {/* Custom color picker */}
                                                <label
                                                    className="relative cursor-pointer w-6 h-6 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary flex items-center justify-center transition-transform hover:scale-110 overflow-hidden shadow-xs"
                                                    title={language === 'fr' ? 'Couleur personnalisée' : 'Custom color'}
                                                >
                                                    <input
                                                        type="color"
                                                        value={newFeedColor}
                                                        onChange={(e) => setNewFeedColor(e.target.value)}
                                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                    />
                                                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Submit button */}
                                        <div className="pt-2 flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isTestingNew || !newFeedUrl.trim()}
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isTestingNew && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                                <span>{language === 'fr' ? 'Tester & Ajouter cet agenda' : 'Test & Add Calendar'}</span>
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Tutorial guide */}
                                <div className="bg-muted/40 border rounded-xl p-3.5 text-xs space-y-2 text-muted-foreground">
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                        <ExternalLink className="h-3.5 w-3.5 text-primary" />
                                        <span>{language === 'fr' ? 'Où trouver l\'adresse iCal :' : 'Where to find your iCal link:'}</span>
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                                        <li><strong>Google Agenda</strong> : Paramètres de l'agenda &gt; Intégrer l'agenda &gt; <em>Adresse secrète au format iCal</em>.</li>
                                        <li><strong>Université / École</strong> : Sur votre portail étudiant (ADE, Hyperplanning, Celcat), cherchez l'option <em>« Exporter vers agenda »</em> ou <em>« Abonnement iCal / ICS »</em>.</li>
                                        <li><strong>Apple Calendar / Outlook</strong> : Partage de calendrier &gt; <em>Lien ICS public ou privé</em>.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: EXPORT EDUTRACK TASKS TO GOOGLE/APPLE CALENDAR */}
                        {activeTab === 'export' && (
                            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl text-xs text-muted-foreground space-y-1">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                        {language === 'fr' ? 'Synchronisation automatique vers votre mobile' : 'Automatic sync to your phone'}
                                    </span>
                                    <p>
                                        {language === 'fr'
                                            ? 'Abonnez-vous à ce flux iCal dans Google Agenda, l\'application Calendrier de votre iPhone ou Outlook pour retrouver automatiquement vos devoirs, révisions et partiels EduTrack sur votre smartphone.'
                                            : 'Subscribe to this iCal feed in Google Calendar, Apple Calendar or Outlook to automatically see your EduTrack assignments and study tasks on your phone.'}
                                    </p>
                                </div>

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
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-end p-4 border-t bg-muted/20">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
                            >
                                {language === 'fr' ? 'Fermer' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Calendar Modal */}
            <EditCalendarModal
                isOpen={!!editingFeed}
                onClose={() => setEditingFeed(null)}
                feed={editingFeed}
            />
        </>
    )
}

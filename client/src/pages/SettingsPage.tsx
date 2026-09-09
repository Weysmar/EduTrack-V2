import { useState } from 'react'
import { ApiKeySettings } from "@/components/profile/ApiKeySettings"
import { AdminUserManagement } from "@/components/settings/AdminUserManagement"
import { Settings, Moon, Sun, Monitor, Keyboard, Key, ChevronRight, History, Layout, Users, Calendar, Globe } from "lucide-react"
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'
import { useCalendarStore } from '@/store/calendarStore'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'
import { useAuthStore } from '@/store/authStore'
import { changelogs } from '@/data/changelog'

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'raccourcis' | 'api' | 'changelog' | 'users' | 'calendars'>('calendars')
    const { theme, setTheme, themeColor, setThemeColor, minecraftTheme, setMinecraftTheme } = useTheme()
    const { t, language, setLanguage } = useLanguage()
    const { feeds } = useCalendarStore()
    const useNavigateCallback = useNavigate()
    const { activeProfile, updateProfile } = useProfileStore()
    const { user } = useAuthStore()

    const isAdmin = !!user?.isAdmin || user?.email?.toLowerCase() === 'intelli.vince@gmail.com'

    const tabs = [
        ...(isAdmin ? [{ id: 'users', label: language === 'fr' ? 'Utilisateurs' : 'Users', icon: Users }] : []),
        { id: 'calendars', label: language === 'fr' ? 'Agendas' : 'Calendars', icon: Calendar },
        { id: 'appearance', label: language === 'fr' ? 'Apparence & Langue' : 'Appearance & Language', icon: Sun },
        { id: 'api', label: t('settings.tabs.api'), icon: Key },
        { id: 'raccourcis', label: t('settings.tabs.shortcuts'), icon: Keyboard },
        { id: 'changelog', label: t('changelog.title'), icon: History },
    ] as const

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4">
            <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-primary/10 rounded-xl text-primary font-bold">
                    <Settings className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('settings.page.title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('settings.page.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
                {/* Sidebar Navigation */}
                <aside className="space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                    activeTab === tab.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </div>
                                {activeTab === tab.id && <ChevronRight className="h-4 w-4" />}
                            </button>
                        )
                    })}
                </aside>

                {/* Content Area */}
                <main className="bg-card border rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
                    <div className="p-8">


                        {activeTab === 'users' && isAdmin && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{language === 'fr' ? "Administration des Utilisateurs" : "User Administration"}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {language === 'fr'
                                            ? "Créez et gérez les comptes autorisés à accéder à la plateforme."
                                            : "Create and manage accounts authorized to access the platform."}
                                    </p>
                                </div>
                                <AdminUserManagement />
                            </div>
                        )}

                        {activeTab === 'api' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('settings.api.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">{t('settings.api.desc')}</p>
                                </div>
                                <ApiKeySettings />
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('settings.appearance.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">{t('settings.appearance.desc')}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:bg-muted group",
                                            theme === 'light' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-full mb-3", theme === 'light' ? "bg-primary text-primary-foreground" : "bg-background")}>
                                            <Sun className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-medium">{t('settings.theme.light')}</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:bg-muted group",
                                            theme === 'dark' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-full mb-3", theme === 'dark' ? "bg-primary text-primary-foreground" : "bg-background")}>
                                            <Moon className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-medium">{t('settings.theme.dark')}</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("system")}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:bg-muted group",
                                            theme === 'system' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-full mb-3", theme === 'system' ? "bg-primary text-primary-foreground" : "bg-background")}>
                                            <Monitor className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-medium">{t('settings.theme.system')}</span>
                                    </button>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-lg font-medium">Color Theme</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <button
                                            onClick={() => setThemeColor("default")}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:bg-muted group relative overflow-hidden",
                                                themeColor === 'default' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <div className="w-full h-12 rounded-lg bg-blue-500 mb-2 shadow-sm" />
                                            <span className="text-sm font-medium">Ocean (Default)</span>
                                        </button>
                                        <button
                                            onClick={() => setThemeColor("nature")}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:bg-muted group relative overflow-hidden",
                                                themeColor === 'nature' ? "border-green-600 bg-green-500/10 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <div className="w-full h-12 rounded-lg bg-green-600 mb-2 shadow-sm" />
                                            <span className="text-sm font-medium">Nature</span>
                                        </button>
                                        <button
                                            onClick={() => setThemeColor("sunset")}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:bg-muted group relative overflow-hidden",
                                                themeColor === 'sunset' ? "border-orange-500 bg-orange-500/10 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <div className="w-full h-12 rounded-lg bg-orange-500 mb-2 shadow-sm" />
                                            <span className="text-sm font-medium">Sunset</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
                                        <div className="space-y-1">
                                            <h3 className="text-base font-semibold flex items-center gap-2">
                                                <img src="/assets/minecraft_grass_block.webp" alt="MC" className="w-6 h-6 object-contain" />
                                                {language === 'fr' ? 'Style Visuel Rétro (Minecraft / Cubique)' : 'Retro Visual Style (Minecraft / Cubic)'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground max-w-xl">
                                                {language === 'fr' 
                                                    ? "Active l'esthétique pixel art, la typographie Minecraftia et les bordures carrées tout en conservant intégralement votre langue choisie (Français ou Anglais)."
                                                    : "Enables pixel art aesthetics, Minecraftia typography, and square borders while preserving your chosen language (French or English)."}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setMinecraftTheme(!minecraftTheme)}
                                            className={cn(
                                                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out self-start sm:self-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                                minecraftTheme ? "bg-emerald-600" : "bg-muted"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                                    minecraftTheme ? "translate-x-5" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t">
                                    <h3 className="text-lg font-medium flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-primary" />
                                        {language === 'fr' ? 'Langue de l\'application' : 'Application Language'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'fr' 
                                            ? 'Choisissez la langue principale d\'affichage pour l\'ensemble d\'EduTrack.' 
                                            : 'Choose the interface display language for EduTrack.'}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setLanguage('fr')}
                                            className={cn(
                                                "flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all hover:bg-muted group text-left",
                                                language === 'fr' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <img src="https://flagcdn.com/w40/fr.png" alt="FR" className="w-8 h-5 object-cover rounded shadow-sm" />
                                            <div>
                                                <div className="font-semibold text-sm">Français</div>
                                                <div className="text-xs text-muted-foreground">{language === 'fr' ? 'Langue par défaut' : 'Default language'}</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLanguage('en')}
                                            className={cn(
                                                "flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all hover:bg-muted group text-left",
                                                language === 'en' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <img src="https://flagcdn.com/w40/gb.png" alt="UK" className="w-8 h-5 object-cover rounded shadow-sm" />
                                            <div>
                                                <div className="font-semibold text-sm">English</div>
                                                <div className="text-xs text-muted-foreground">International</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'calendars' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">
                                        {language === 'fr' ? "Agendas & Synchronisation (iCal)" : "Calendars & Sync (iCal)"}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {language === 'fr'
                                            ? "Connectez vos emplois du temps de promotion ou vos calendriers personnels (Google Calendar, Apple, Outlook) pour afficher vos cours et devoirs."
                                            : "Connect your school schedules or personal calendars (Google Calendar, Apple, Outlook) to view your classes and assignments."}
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl bg-muted/30 border space-y-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-base flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-primary" />
                                                {language === 'fr' ? "Gestionnaire des agendas" : "Calendar Manager"}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {language === 'fr'
                                                    ? "Configurez l'agenda principal, ajoutez de multiples lignes iCal ou exportez votre emploi du temps."
                                                    : "Configure your primary calendar, add multiple iCal feeds or export your schedule."}
                                            </p>
                                        </div>

                                        <GoogleConnectButton />
                                    </div>

                                    {/* List current feeds status */}
                                    <div className="pt-4 border-t space-y-3">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {language === 'fr' ? "Agendas connectés actuels" : "Currently connected calendars"}
                                        </h4>
                                        {feeds.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">
                                                {language === 'fr' 
                                                    ? "Aucun agenda n'est actuellement synchronisé. Cliquez sur le bouton ci-dessus pour connecter votre premier calendrier."
                                                    : "No calendars are currently synced. Click the button above to connect your first calendar."}
                                            </p>
                                        ) : (
                                            <div className="grid gap-2">
                                                {feeds.map((feed) => (
                                                    <div 
                                                        key={feed.id}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-card border text-sm"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div 
                                                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                                                                style={{ backgroundColor: feed.color }} 
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="font-medium truncate">{feed.name}</div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-md">{feed.url}</div>
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "text-xs px-2.5 py-1 rounded-full font-medium shrink-0",
                                                            feed.enabled !== false 
                                                                ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                                                                : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {feed.enabled !== false 
                                                                ? (language === 'fr' ? "Actif" : "Active")
                                                                : (language === 'fr' ? "Masqué" : "Hidden")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'raccourcis' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('settings.shortcuts.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">{t('settings.shortcuts.desc')}</p>
                                </div>

                                <div className="space-y-10 text-sm">
                                    <section className="space-y-3">
                                        <h3 className="font-bold text-xs uppercase text-primary tracking-widest px-1">{t('settings.shortcuts.global')}</h3>
                                        <div className="grid gap-2">
                                            <ShortcutItem keys={["⌘", "K"]} label={t('search.placeholder')} />
                                            <ShortcutItem keys={["Esc"]} label={t('focus.exit.tooltip')} />
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="font-bold text-xs uppercase text-primary tracking-widest px-1">{t('settings.shortcuts.flashcards')}</h3>
                                        <div className="grid gap-2">
                                            <ShortcutItem keys={["Espace"]} label={t('summary.trigger')} />
                                            <ShortcutItem keys={["1", "2", "3", "4"]} label={t('diff.easy') + " - " + t('diff.hard')} />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'changelog' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('changelog.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">{t('changelog.desc')}</p>
                                </div>
                                <div className="space-y-8 pl-2">
                                    {changelogs.map((log) => (
                                        <div key={log.version} className="relative pl-6 border-l-2 border-muted space-y-2">
                                            <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    {log.version}
                                                    {log.version === changelogs[0].version && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">{t('changelog.current')}</span>
                                                    )}
                                                </h3>
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full w-fit">{log.date}</span>
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground mb-3">{t(log.title)}</p>

                                            <ul className="space-y-2.5">
                                                {log.changes.map((change, i) => (
                                                    <li key={i} className="text-sm flex items-start gap-3">
                                                        <span className={cn(
                                                            "uppercase text-[10px] font-bold px-2 py-0.5 rounded shrink-0 whitespace-nowrap mt-0.5 text-center min-w-[5.5rem] tracking-wider",
                                                            change.type === 'new' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-500/20",
                                                            change.type === 'fix' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-500/20",
                                                            change.type === 'improvement' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-500/20",
                                                        )}>
                                                            {change.type === 'new' ? (t('changelog.type.new') || 'NOUVEAU') :
                                                             change.type === 'improvement' ? (t('changelog.type.improvement') || 'AMÉLIORÉ') :
                                                             (t('changelog.type.fix') || 'CORRECTIF')}
                                                        </span>
                                                        <span className="text-muted-foreground leading-relaxed flex-1 min-w-0">{t(change.description)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div >

        </div >
    )
}

function ShortcutItem({ keys, label }: { keys: string[], label: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
            <span className="text-foreground">{label}</span>
            <div className="flex gap-1.5">
                {keys.map((k, i) => (
                    <kbd key={i} className="min-w-[24px] h-6 flex items-center justify-center rounded border bg-background px-1.5 font-mono text-[10px] font-bold text-primary shadow-sm">
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    )
}

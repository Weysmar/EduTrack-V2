import { useState } from 'react'
import { ApiKeySettings } from "@/components/profile/ApiKeySettings"
import { Settings, Moon, Sun, Monitor, Keyboard, Key, ChevronRight, History, Palette } from "lucide-react"
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { financeChangelogs } from '@/data/financeChangelog'

export function FinanceSettings() {
    const [activeTab, setActiveTab] = useState<'appearance' | 'raccourcis' | 'api' | 'changelog'>('api')
    const { theme, setTheme, themeColor, setThemeColor } = useTheme()
    const { t } = useLanguage()

    const tabs = [
        { id: 'api', label: t('settings.tabs.api'), icon: Key },
        { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
        { id: 'raccourcis', label: t('settings.tabs.shortcuts'), icon: Keyboard },
        { id: 'changelog', label: t('changelog.title'), icon: History },
    ] as const

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4">
            <div className="flex items-center gap-3 mb-10">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 font-bold">
                    <Settings className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Paramètres FinanceTrack</h1>
                    <p className="text-muted-foreground text-sm">Gérez vos préférences et connexions pour la finance</p>
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
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
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
                        {activeTab === 'api' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('settings.api.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Connectez vos services IA pour l'analyse financière.</p>
                                </div>
                                {/* Reusing global ApiKeySettings but wrapped/framed */}
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
                                            theme === 'light' ? "border-emerald-500 bg-emerald-500/5 shadow-inner" : "border-transparent bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-full mb-3", theme === 'light' ? "bg-emerald-500 text-white" : "bg-background")}>
                                            <Sun className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-medium">{t('settings.theme.light')}</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:bg-muted group",
                                            theme === 'dark' ? "border-emerald-500 bg-emerald-500/5 shadow-inner" : "border-transparent bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-full mb-3", theme === 'dark' ? "bg-emerald-500 text-white" : "bg-background")}>
                                            <Moon className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-medium">{t('settings.theme.dark')}</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("system")}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:bg-muted group",
                                            theme === 'system' ? "border-emerald-500 bg-emerald-500/5 shadow-inner" : "border-transparent bg-muted/30"
                                        )}
                                    >
                                        <div className={cn("p-3 rounded-full mb-3", theme === 'system' ? "bg-emerald-500 text-white" : "bg-background")}>
                                            <Monitor className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-medium">{t('settings.theme.system')}</span>
                                    </button>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-lg font-medium">Thème Couleur</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <button
                                            onClick={() => setThemeColor("default")}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:bg-muted group relative overflow-hidden",
                                                themeColor === 'default' ? "border-blue-500 bg-blue-500/5 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <div className="w-full h-12 rounded-lg bg-blue-500 mb-2 shadow-sm" />
                                            <span className="text-sm font-medium">Standard</span>
                                        </button>
                                        <button
                                            onClick={() => setThemeColor("nature")}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:bg-muted group relative overflow-hidden",
                                                themeColor === 'nature' ? "border-emerald-600 bg-emerald-500/10 shadow-inner" : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <div className="w-full h-12 rounded-lg bg-emerald-600 mb-2 shadow-sm" />
                                            <span className="text-sm font-medium">Finance (Recommandé)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'raccourcis' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('settings.shortcuts.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Accélérez votre gestion financière.</p>
                                </div>

                                <div className="space-y-10 text-sm">
                                    <section className="space-y-3">
                                        <h3 className="font-bold text-xs uppercase text-emerald-500 tracking-widest px-1">Général</h3>
                                        <div className="grid gap-2">
                                            <ShortcutItem keys={["⌘", "K"]} label="Recherche Globale" />
                                            <ShortcutItem keys={["N"]} label="Nouvelle Transaction (Bientôt)" />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'changelog' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">{t('changelog.title')}</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Nouveautés de FinanceTrack.</p>
                                </div>
                                <div className="space-y-8 pl-2">
                                    {financeChangelogs.map((log) => (
                                        <div key={log.version} className="relative pl-6 border-l-2 border-muted space-y-2">
                                            <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-emerald-500" />

                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    {log.version}
                                                    {log.version === financeChangelogs[0].version && (
                                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('changelog.current')}</span>
                                                    )}
                                                </h3>
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full w-fit">{log.date}</span>
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground mb-3">{t(log.title) || log.title}</p>

                                            <ul className="space-y-2.5">
                                                {log.changes.map((change, i) => (
                                                    <li key={i} className="text-sm flex gap-3">
                                                        <span className={cn(
                                                            "uppercase text-[10px] font-bold px-1.5 py-0.5 rounded h-fit mt-0.5 min-w-[3rem] text-center",
                                                            change.type === 'new' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                            change.type === 'fix' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                            change.type === 'improvement' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                                        )}>
                                                            {change.type}
                                                        </span>
                                                        <span className="text-muted-foreground leading-relaxed">{t(change.description) || change.description}</span>
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
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-transparent hover:border-emerald-500/20 transition-all">
            <span className="text-foreground">{label}</span>
            <div className="flex gap-1.5">
                {keys.map((k, i) => (
                    <kbd key={i} className="min-w-[24px] h-6 flex items-center justify-center rounded border bg-background px-1.5 font-mono text-[10px] font-bold text-emerald-600 shadow-sm">
                        {k}
                    </kbd>
                ))}
            </div>
        </div>
    )
}

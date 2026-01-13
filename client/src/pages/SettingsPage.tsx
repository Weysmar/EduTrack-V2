import { useState } from 'react'
import { ApiKeySettings } from "@/components/profile/ApiKeySettings"
import { Settings, Moon, Sun, Monitor, Keyboard, Key, ChevronRight, History } from "lucide-react"
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'
import { changelogs } from '@/data/changelog'

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'raccourcis' | 'api' | 'changelog'>('api')
    const { theme, setTheme, themeColor, setThemeColor } = useTheme()
    const { t } = useLanguage()
    const useNavigateCallback = useNavigate()
    const { activeProfile } = useProfileStore()

    const tabs = [
        { id: 'api', label: t('settings.tabs.api'), icon: Key },
        { id: 'appearance', label: t('settings.tabs.appearance'), icon: Sun },
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
                                                    <li key={i} className="text-sm flex gap-3">
                                                        <span className={cn(
                                                            "uppercase text-[10px] font-bold px-1.5 py-0.5 rounded h-fit mt-0.5 min-w-[3rem] text-center",
                                                            change.type === 'new' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                            change.type === 'fix' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                            change.type === 'improvement' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                                        )}>
                                                            {change.type}
                                                        </span>
                                                        <span className="text-muted-foreground leading-relaxed">{t(change.description)}</span>
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

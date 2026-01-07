import { useState } from 'react'
import { ApiKeySettings } from "@/components/profile/ApiKeySettings"
import { Settings, Moon, Sun, Monitor, Keyboard, Key, ChevronRight, History } from "lucide-react"
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'
import { ChangelogModal } from '@/components/ChangelogModal'

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'apparence' | 'raccourcis' | 'api' | 'changelog'>('api')
    const [isChangelogOpen, setIsChangelogOpen] = useState(false)
    const { theme, setTheme } = useTheme()
    const { t } = useLanguage()
    const useNavigateCallback = useNavigate()
    const { activeProfile } = useProfileStore()

    const tabs = [
        { id: 'api', label: t('settings.tabs.api'), icon: Key },
        { id: 'apparence', label: t('settings.tabs.appearance'), icon: Sun },
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

                        {activeTab === 'apparence' && (
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
                                <button
                                    onClick={() => setIsChangelogOpen(true)}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all font-medium shadow-sm flex items-center justify-center gap-2"
                                >
                                    <History className="h-5 w-5" />
                                    {t('changelog.view')}
                                </button>
                            </div>
                        )}

                    </div>
                </main>
            </div >
            <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
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

import { useState } from 'react'
import { ApiKeySettings } from "@/components/profile/ApiKeySettings"
import { Settings, Moon, Sun, Monitor, Keyboard, Key, ChevronRight, AlertCircle, Trash2 } from "lucide-react"
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '@/store/profileStore'
import { useAuthStore } from '@/store/authStore'

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'apparence' | 'raccourcis' | 'api'>('api')
    const { theme, setTheme } = useTheme()
    const { t } = useLanguage()
    const navigate = useNavigate()

    const { activeProfile, deleteProfile } = useProfileStore()
    const { deleteAccount } = useAuthStore()

    const handleDeleteAccount = async () => {
        if (!activeProfile) return

        if (confirm(t('settings.danger.deleteConfirm') || "Are you sure? This action is irreversible.")) {
            try {
                // Delete from Server
                await deleteAccount();
                await deleteProfile(activeProfile.id);
                navigate('/auth')
            } catch (e) {
                alert("Failed to delete account on server.");
                console.error(e);
            }
        }
    }

    const tabs = [
        { id: 'api', label: t('settings.tabs.api'), icon: Key },
        { id: 'apparence', label: t('settings.tabs.appearance'), icon: Sun },
        { id: 'raccourcis', label: t('settings.tabs.shortcuts'), icon: Keyboard },
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

                        {/* Danger Zone */}
                        <div className="mt-12 pt-8 border-t border-red-200 dark:border-red-900/30">
                            <h3 className="text-red-600 font-bold mb-4 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                {t('settings.danger.title') || "Zone de Danger"}
                            </h3>

                            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/20 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-red-900 dark:text-red-200">{t('settings.danger.deleteAccount') || "Supprimer le compte"}</p>
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        {t('settings.danger.deleteDesc') || "Cette action est irréversible. Toutes vos données seront perdues."}
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t('settings.danger.deleteBtn') || "Supprimer définitivement"}
                                </button>
                            </div>
                        </div>
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

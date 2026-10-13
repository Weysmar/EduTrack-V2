
import { useState, useEffect } from 'react'
import { useProfileStore } from '@/store/profileStore'
import { getModelsForProvider, getDefaultModel, isAIProvider, AI_PROVIDERS, PROVIDER_LABELS, DEFAULT_GEMINI_MODEL, normalizeModelId, type AIProvider } from '@/config/aiModels'
import { CLAUDE_KEY_URL, GEMINI_KEY_URL, PERPLEXITY_KEY_URL } from '@/lib/ai/constants'
import { Eye, EyeOff, Save, AlertCircle, Wallet, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

type ApiKeyForm = {
    google_gemini_api_key: string;
    perplexity_api_key: string;
    anthropic_api_key: string;
    google_calendar: string;
    google_client_id: string;
    google_drive_api_key: string;
    finance_audit_provider: AIProvider;
    finance_audit_model: string;
}

/** Un seul emplacement de clé par fournisseur IA */
const AI_KEY_SECTIONS: { provider: AIProvider; field: 'google_gemini_api_key' | 'perplexity_api_key' | 'anthropic_api_key'; titleKey: string; labelKey: string; placeholderKey: string; hintKey: string; keyUrl: string }[] = [
    { provider: 'google', field: 'google_gemini_api_key', titleKey: 'settings.api.gemini.vincent', labelKey: 'settings.api.gemini.key', placeholderKey: 'settings.api.placeholder.gemini', hintKey: 'settings.api.gemini.hint', keyUrl: GEMINI_KEY_URL },
    { provider: 'perplexity', field: 'perplexity_api_key', titleKey: 'settings.api.perplexity.default', labelKey: 'settings.api.perplexity.key', placeholderKey: 'settings.api.placeholder.pplx', hintKey: 'settings.api.perplexity.hint', keyUrl: PERPLEXITY_KEY_URL },
    { provider: 'anthropic', field: 'anthropic_api_key', titleKey: 'settings.api.claude.title', labelKey: 'settings.api.claude.key', placeholderKey: 'settings.api.placeholder.claude', hintKey: 'settings.api.claude.hint', keyUrl: CLAUDE_KEY_URL },
]

export function ApiKeySettings() {
    const { activeProfile, getApiKey, getProviderKey, updateApiKeys } = useProfileStore()
    const { t } = useLanguage()
    const [keys, setKeys] = useState<ApiKeyForm>({
        google_gemini_api_key: '',
        perplexity_api_key: '',
        anthropic_api_key: '',
        google_calendar: '',
        google_client_id: '',
        google_drive_api_key: '',
        finance_audit_provider: 'google',
        finance_audit_model: DEFAULT_GEMINI_MODEL
    })

    const [showKey, setShowKey] = useState<Record<string, boolean>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (activeProfile) {
            const savedProvider = getApiKey('finance_audit_provider')
            setKeys({
                // Reprend aussi les clés des anciens emplacements (résumés / exercices)
                google_gemini_api_key: getProviderKey('google') || '',
                perplexity_api_key: getProviderKey('perplexity') || '',
                anthropic_api_key: getProviderKey('anthropic') || '',
                google_calendar: getApiKey('google_calendar') || '',
                google_client_id: getApiKey('google_client_id') || '',
                google_drive_api_key: getApiKey('google_drive_api_key') || '',
                finance_audit_provider: isAIProvider(savedProvider) ? savedProvider : 'google',
                finance_audit_model: normalizeModelId(getApiKey('finance_audit_model')) || DEFAULT_GEMINI_MODEL
            })
        }
    }, [activeProfile?.id]) // Only update if profile changes, not on every refresh

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)
        try {
            const trimmedKeys: any = {}
            for (const [k, v] of Object.entries(keys)) {
                trimmedKeys[k] = typeof v === 'string' ? v.trim() : v
            }
            setKeys(trimmedKeys)
            await updateApiKeys(trimmedKeys)

            setMessage({ type: 'success', text: t('settings.save.success') })

            // Clear message after 3s
            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            setMessage({ type: 'error', text: t('settings.save.error') })
        } finally {
            setIsSaving(false)
        }
    }

    const toggleShow = (key: string) => {
        setShowKey(prev => ({ ...prev, [key]: !prev[key] }))
    }

    if (!activeProfile) return <div className="p-4 text-center text-muted-foreground">{t('course.notFound')}</div>

    return (
        <div className="space-y-8">
            {message && (
                <div className={cn(
                    "p-3 rounded-md text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1",
                    message.type === 'success' ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
                )}>
                    {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Fournisseurs IA : une clé chacun */}
                {AI_KEY_SECTIONS.map(section => (
                    <div key={section.provider} className="space-y-3">
                        <h3 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b pb-2">{t(section.titleKey)}</h3>

                        <ApiKeyInput
                            id={section.field}
                            label={t(section.labelKey)}
                            value={keys[section.field]}
                            onChange={v => setKeys(prev => ({ ...prev, [section.field]: v }))}
                            show={showKey[section.field]}
                            onToggle={() => toggleShow(section.field)}
                            placeholder={t(section.placeholderKey)}
                        />
                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5">
                            <span>{t(section.hintKey)}</span>
                            <a
                                href={section.keyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
                            >
                                {t('settings.api.getKey')}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </p>
                    </div>
                ))}

                {/* Integrations Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b pb-2">{t('settings.api.integrations')}</h3>

                    <ApiKeyInput
                        id="google_calendar"
                        label="Google Calendar (URL iCal)"
                        value={keys.google_calendar}
                        onChange={v => setKeys(prev => ({ ...prev, google_calendar: v }))}
                        show={showKey['google_calendar']}
                        onToggle={() => toggleShow('google_calendar')}
                        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                    />

                    <ApiKeyInput
                        id="google_client_id"
                        label="Google Drive - OAuth Client ID"
                        value={keys.google_client_id}
                        onChange={v => setKeys(prev => ({ ...prev, google_client_id: v }))}
                        show={showKey['google_client_id']}
                        onToggle={() => toggleShow('google_client_id')}
                        placeholder="ex: 123456789-abc.apps.googleusercontent.com"
                    />

                    <ApiKeyInput
                        id="google_drive_api_key"
                        label="Google Drive - API Key (Picker)"
                        value={keys.google_drive_api_key}
                        onChange={v => setKeys(prev => ({ ...prev, google_drive_api_key: v }))}
                        show={showKey['google_drive_api_key']}
                        onToggle={() => toggleShow('google_drive_api_key')}
                        placeholder="ex: AIzaSy..."
                    />
                </div>
            </div>

            {/* FinanceTrack Settings */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-base">{t('settings.api.finance.title')}</h3>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">{t('settings.api.finance.provider')}</label>
                            <select
                                value={keys.finance_audit_provider}
                                onChange={(e) => {
                                    const provider = e.target.value as AIProvider;
                                    setKeys(prev => ({
                                        ...prev,
                                        finance_audit_provider: provider,
                                        finance_audit_model: getDefaultModel(provider)
                                    }));
                                }}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            >
                                {AI_PROVIDERS.map(provider => (
                                    <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">{t('settings.api.finance.model')}</label>
                            <select
                                value={keys.finance_audit_model}
                                onChange={(e) => setKeys(prev => ({ ...prev, finance_audit_model: e.target.value }))}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            >
                                {getModelsForProvider(keys.finance_audit_provider).map(m => (
                                    <option key={m.id} value={m.id}>{m.displayName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {isSaving ? t('settings.save.saving') : t('settings.save.button')}
                </button>
            </div>
        </div>
    )
}

function ApiKeyInput({ id, label, value, onChange, show, onToggle, placeholder }: {
    id: string;
    label: string;
    value: string;
    onChange: (val: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
}) {
    const { t } = useLanguage()
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="text-sm font-medium">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-background border rounded-md pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono"
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={show ? t('settings.api.hideKey') : t('settings.api.showKey')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    )
}

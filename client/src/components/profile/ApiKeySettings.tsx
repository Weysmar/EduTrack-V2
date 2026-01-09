
import { useState, useEffect } from 'react'
import { useProfileStore } from '@/store/profileStore'
import { Eye, EyeOff, Save, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

export function ApiKeySettings() {
    const { activeProfile, getApiKey, updateApiKeys } = useProfileStore()
    const { t } = useLanguage()
    const [keys, setKeys] = useState<{
        perplexity_summaries: string;
        perplexity_exercises: string;
        google_calendar: string;
        google_gemini_summaries: string;
        google_gemini_exercises: string;
    }>({
        perplexity_summaries: '',
        perplexity_exercises: '',
        google_calendar: '',
        google_gemini_summaries: '',
        google_gemini_exercises: ''
    })

    const [showKey, setShowKey] = useState<Record<string, boolean>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (activeProfile) {
            setKeys({
                perplexity_summaries: getApiKey('perplexity_summaries') || '',
                perplexity_exercises: getApiKey('perplexity_exercises') || '',
                google_calendar: getApiKey('google_calendar') || '',
                google_gemini_summaries: getApiKey('google_gemini_summaries') || '',
                google_gemini_exercises: getApiKey('google_gemini_exercises') || ''
            })
        }
    }, [activeProfile?.id]) // Only update if profile changes, not on every refresh

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)
        try {
            await updateApiKeys(keys)

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
                {/* Perplexity Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b pb-2">{t('settings.api.perplexity.default')}</h3>

                    <ApiKeyInput
                        id="perplexity_summaries"
                        label={t('settings.api.perplexity.summaries')}
                        value={keys.perplexity_summaries}
                        onChange={v => setKeys(prev => ({ ...prev, perplexity_summaries: v }))}
                        show={showKey['perplexity_summaries']}
                        onToggle={() => toggleShow('perplexity_summaries')}
                        placeholder={t('settings.api.placeholder.pplx')}
                    />

                    <ApiKeyInput
                        id="perplexity_exercises"
                        label={t('settings.api.perplexity.exercises')}
                        value={keys.perplexity_exercises}
                        onChange={v => setKeys(prev => ({ ...prev, perplexity_exercises: v }))}
                        show={showKey['perplexity_exercises']}
                        onToggle={() => toggleShow('perplexity_exercises')}
                        placeholder={t('settings.api.placeholder.pplx')}
                    />
                </div>

                {/* Google Gemini Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b pb-2">{t('settings.api.gemini.vincent')}</h3>

                    <ApiKeyInput
                        id="google_gemini_summaries"
                        label={t('settings.api.gemini.summaries')}
                        value={keys.google_gemini_summaries}
                        onChange={v => setKeys(prev => ({ ...prev, google_gemini_summaries: v }))}
                        show={showKey['google_gemini_summaries']}
                        onToggle={() => toggleShow('google_gemini_summaries')}
                        placeholder={t('settings.api.placeholder.gemini')}
                    />

                    <ApiKeyInput
                        id="google_gemini_exercises"
                        label={t('settings.api.gemini.exercises')}
                        value={keys.google_gemini_exercises}
                        onChange={v => setKeys(prev => ({ ...prev, google_gemini_exercises: v }))}
                        show={showKey['google_gemini_exercises']}
                        onToggle={() => toggleShow('google_gemini_exercises')}
                        placeholder={t('settings.api.placeholder.gemini')}
                    />
                </div>

                {/* Google Calendar Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b pb-2">{t('settings.api.integrations')}</h3>

                    <ApiKeyInput
                        id="google_calendar"
                        label={t('settings.api.calendar')}
                        value={keys.google_calendar}
                        onChange={v => setKeys(prev => ({ ...prev, google_calendar: v }))}
                        show={showKey['google_calendar']}
                        onToggle={() => toggleShow('google_calendar')}
                        placeholder={t('settings.api.placeholder.bearer')}
                    />
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
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    )
}

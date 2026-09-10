import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Palette, Calendar } from 'lucide-react'
import { useCalendarStore, EXTENDED_CALENDAR_COLORS, DEFAULT_CALENDAR_COLORS, type ICalFeed } from '@/store/calendarStore'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EditCalendarModalProps {
    isOpen: boolean
    onClose: () => void
    feed: ICalFeed | null
}

export function EditCalendarModal({ isOpen, onClose, feed }: EditCalendarModalProps) {
    const { language } = useLanguage()
    const { updateFeed } = useCalendarStore()

    const [name, setName] = useState('')
    const [color, setColor] = useState(DEFAULT_CALENDAR_COLORS[0])

    useEffect(() => {
        if (feed) {
            setName(feed.name || '')
            setColor(feed.color || DEFAULT_CALENDAR_COLORS[0])
        }
    }, [feed, isOpen])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen || !feed) return null

    const handleSave = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            toast.error(language === 'fr' ? 'Le nom de l\'agenda ne peut pas être vide' : 'Calendar name cannot be empty')
            return
        }

        const finalColor = color || DEFAULT_CALENDAR_COLORS[0]
        updateFeed(feed.id, {
            name: trimmed,
            color: finalColor
        })

        toast.success(
            language === 'fr'
                ? `Agenda « ${trimmed} » mis à jour avec succès !`
                : `Calendar "${trimmed}" updated successfully!`
        )
        onClose()
    }

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div 
                className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with dynamic calendar color banner */}
                <div
                    className="p-4 border-b flex items-center justify-between text-white transition-colors duration-200 shadow-inner"
                    style={{ backgroundColor: color }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shadow-inner">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base leading-tight">
                                {language === 'fr' ? 'Personnaliser l\'agenda' : 'Customize Calendar'}
                            </h2>
                            <p className="text-xs opacity-90 truncate max-w-[240px]">
                                {feed.name}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                        title={language === 'fr' ? 'Fermer' : 'Close'}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSave} className="p-5 space-y-4">
                    {/* 1. Name input */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {language === 'fr' ? 'Nom de l\'agenda' : 'Calendar name'} *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={language === 'fr' ? 'Ex: Cours Promo, Personnel, Job étudiant...' : 'Ex: Classes, Personal, Work...'}
                            className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-muted/40 border border-input focus:outline-none focus:ring-2 focus:ring-primary font-medium transition-all"
                            autoFocus
                            required
                        />
                        <p className="text-[11px] font-mono text-muted-foreground truncate opacity-70">
                            {feed.url}
                        </p>
                    </div>

                    {/* 2. Color Presets & Custom Picker */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {language === 'fr' ? 'Couleur d\'identification' : 'Badge & Event Color'}
                        </label>
                        
                        {/* Swatches Grid */}
                        <div className="grid grid-cols-8 gap-2">
                            {EXTENDED_CALENDAR_COLORS.map((c) => {
                                const isSelected = color.toLowerCase() === c.toLowerCase()
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-7 h-7 rounded-full transition-transform flex items-center justify-center shadow-xs mx-auto cursor-pointer",
                                            isSelected
                                                ? "scale-115 ring-2 ring-primary ring-offset-2 ring-offset-background"
                                                : "hover:scale-110"
                                        )}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    >
                                        {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Custom Color Native Input */}
                        <div className="flex items-center justify-between pt-1">
                            <label
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-input bg-muted/30 hover:bg-muted text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            >
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent"
                                />
                                <Palette className="h-3.5 w-3.5 text-primary" />
                                <span>{language === 'fr' ? 'Nuance personnalisée' : 'Custom shade'}</span>
                            </label>

                            <span className="text-xs font-mono text-muted-foreground font-semibold px-2 py-0.5 rounded bg-muted">
                                {color.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* 3. Live Preview */}
                    <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {language === 'fr' ? 'Aperçu dans l\'agenda' : 'Calendar View Preview'}
                        </label>
                        <div
                            className="p-3 rounded-xl border text-xs font-medium space-y-1 transition-all shadow-xs"
                            style={{
                                backgroundColor: `${color}15`,
                                borderColor: `${color}40`
                            }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                                    <span className="font-bold text-foreground truncate">
                                        {name.trim() || feed.name || (language === 'fr' ? 'Mon Agenda' : 'My Calendar')}
                                    </span>
                                </div>
                                <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                                    style={{ backgroundColor: `${color}25`, color }}
                                >
                                    09:00 - 10:30
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground pl-4.5 truncate">
                                {language === 'fr' ? 'Événement de cours ou calendrier externe' : 'Imported timetable event'}
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                            {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            <Check className="h-4 w-4" />
                            <span>{language === 'fr' ? 'Enregistrer les modifications' : 'Save changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

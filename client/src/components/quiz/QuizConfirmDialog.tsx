import React, { useEffect, useId, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuizConfirmDialogProps {
    open: boolean
    title: string
    description?: string
    confirmLabel: string
    cancelLabel: string
    onConfirm: () => void
    onCancel: () => void
    /** Styles the confirm button as destructive (e.g. leaving and losing progress). */
    destructive?: boolean
}

/**
 * Lightweight in-app confirmation (replaces window.confirm) for the quiz flow.
 * - role="alertdialog" + aria-modal, labelled/described
 * - focus moves to the safe (cancel) action, Tab is trapped, Escape cancels
 * - focus is restored to the previously focused element on close
 */
export function QuizConfirmDialog({
    open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, destructive
}: QuizConfirmDialogProps) {
    const titleId = useId()
    const descId = useId()
    const dialogRef = useRef<HTMLDivElement>(null)
    const cancelRef = useRef<HTMLButtonElement>(null)
    const onCancelRef = useRef(onCancel)
    onCancelRef.current = onCancel

    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        cancelRef.current?.focus()

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                onCancelRef.current()
                return
            }
            if (e.key === 'Tab' && dialogRef.current) {
                const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')
                if (focusables.length === 0) return
                const first = focusables[0]
                const last = focusables[focusables.length - 1]
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener('keydown', handleKeyDown, true)
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true)
            previouslyFocused?.focus?.()
        }
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
            <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                className="relative w-full max-w-md bg-card border rounded-2xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            >
                <div className="flex items-start gap-3.5">
                    <div className={cn(
                        "p-2.5 rounded-xl shrink-0",
                        destructive ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                        <h2 id={titleId} className="text-lg font-bold font-heading leading-snug">{title}</h2>
                        {description && (
                            <p id={descId} className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl border bg-card hover:bg-muted transition-colors font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={cn(
                            "min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            destructive
                                ? "bg-red-600 text-white focus-visible:ring-red-500"
                                : "bg-primary text-primary-foreground focus-visible:ring-primary"
                        )}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

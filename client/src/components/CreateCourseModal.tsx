import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useProfileStore } from '@/store/profileStore'

// Removed unused/invalid popover imports

interface CreateCourseModalProps {
    isOpen: boolean
    onClose: () => void
    initialFolderId?: number | string
}

const COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#d946ef', // fuchsia-500
]

const EMOJIS = [
    "📚", "🎓", "✏️", "📐", "🔬", "💻", "🎨", "🎵",
    "🌍", "🧠", "⚡", "🏛️", "🚀", "💡", "📝", "📊",
    "🔢", "⚛️", "🧬", "🧘", "🎬", "⚽", "🏫", "🎒"
]

export function CreateCourseModal({ isOpen, onClose, initialFolderId }: CreateCourseModalProps) {
    const { activeProfile } = useProfileStore()
    const { t } = useLanguage()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState(COLORS[0])
    const [icon, setIcon] = useState('') // Default empty, use user selection
    const queryClient = useQueryClient()

    const createCourseMutation = useMutation({
        mutationFn: async (data: any) => {
            const { courseQueries } = await import('@/lib/api/queries')
            return courseQueries.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] })
            queryClient.invalidateQueries({ queryKey: ['folders'] }) // In case folder counts update
            onClose()
            setTitle('')
            setDescription('')
            setIcon('')
            setColor(COLORS[0])
        },
        onError: (error) => {
            console.error('Failed to create course:', error)
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return
        if (!activeProfile) return

        createCourseMutation.mutate({
            profileId: activeProfile.id,
            title,
            description,
            color,
            icon,
            folderId: initialFolderId,
        })
    }

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        // Modal close triggered
        onClose();
    }

    if (!isOpen) return null

    // Modal rendered

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleClose}>
            <div
                className="w-full max-w-md bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 pointer-events-auto"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('course.create.title')}</h2>
                    <button onClick={handleClose} className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer relative z-[100] pointer-events-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.create.name')}</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 pointer-events-auto"
                            placeholder={t('course.create.name.placeholder')}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.create.desc')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] pointer-events-auto"
                            placeholder={t('course.create.desc.placeholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.create.color')}</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => { setColor(c); setIcon('') }} // prioritizing color resets icon if desired, or keep both. Pattern matches SettingsModal.
                                    className={cn(
                                        "w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background pointer-events-auto",
                                        color === c && !icon && "ring-2 ring-offset-2 ring-primary scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Icon (Overrides Color)</label>
                        <div className="grid grid-cols-8 gap-2">
                            {EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={cn(
                                        "h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors pointer-events-auto",
                                        icon === emoji && "bg-primary/20 ring-1 ring-primary"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                            {/* Clear Icon Button - Optional since color click clears it, but good for UI consistency with Settings */}
                            <button
                                type="button"
                                onClick={() => setIcon('')}
                                className={cn(
                                    "h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-xs text-muted-foreground border border-dashed pointer-events-auto",
                                    !icon && "bg-muted/50"
                                )}
                                title="No Icon"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors pointer-events-auto"
                        >
                            {t('course.create.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={createCourseMutation.isPending}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 pointer-events-auto"
                        >
                            {createCourseMutation.isPending ? t('course.create.loading') : t('course.create.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

interface EditCourseModalProps {
    isOpen: boolean
    onClose: () => void
    course: any // Ideally typed with Course interface
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

export function EditCourseModal({ isOpen, onClose, course }: EditCourseModalProps) {
    const { t } = useLanguage()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [color, setColor] = useState(COLORS[0])
    const [icon, setIcon] = useState('')
    const queryClient = useQueryClient()

    useEffect(() => {
        if (course) {
            setTitle(course.title || '')
            setDescription(course.description || '')
            setColor(course.color || COLORS[0])
            setIcon(course.icon || '')
        }
    }, [course, isOpen])

    const updateCourseMutation = useMutation({
        mutationFn: async (data: any) => {
            const { courseQueries } = await import('@/lib/api/queries')
            return courseQueries.update(course.id, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] })
            queryClient.invalidateQueries({ queryKey: ['course', course.id] })
            onClose()
        },
        onError: (error) => {
            console.error('Failed to update course:', error)
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        updateCourseMutation.mutate({
            title,
            description,
            color,
            icon,
        })
    }

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        onClose()
    }

    if (!isOpen || !course) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleClose}>
            <div
                className="w-full max-w-md bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('course.edit')}</h2>
                    <button onClick={handleClose} className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer relative z-[100] pointer-events-auto">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.title')}</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('course.placeholder')}
                            className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.desc')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('course.descPlaceholder')}
                            className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.icon')}</label>
                        <div className="p-3 border rounded-md space-y-4">
                            {/* Color Selection */}
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                            color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>

                            {/* Emoji Selection */}
                            <div className="space-y-2 pt-2 border-t">
                                <div className="grid grid-cols-8 gap-2">
                                    {EMOJIS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setIcon(icon === emoji ? '' : emoji)}
                                            className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-lg",
                                                icon === emoji && "bg-primary/10 ring-1 ring-primary"
                                            )}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 hover:bg-muted rounded-md transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || updateCourseMutation.isPending}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {updateCourseMutation.isPending ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

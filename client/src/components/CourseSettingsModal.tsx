import { useState, useEffect } from 'react'
import { Course } from '@/lib/types';
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

interface CourseSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    course: Course
}

const COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
]

const EMOJIS = [
    "📚", "🎓", "✏️", "📐", "🔬", "💻", "🎨", "🎵",
    "🌍", "🧠", "⚡", "🏛️", "🚀", "💡", "📝", "📊",
    "🔢", "⚛️", "🧬", "🧘", "🎬", "⚽", "🏫", "🎒"
]

export function CourseSettingsModal({ isOpen, onClose, course }: CourseSettingsModalProps) {
    const [title, setTitle] = useState(course.title)
    const [description, setDescription] = useState(course.description || '')
    const [color, setColor] = useState(course.color)
    const [icon, setIcon] = useState(course.icon || '')
    const [isFavorite, setIsFavorite] = useState(course.isFavorite || false)
    const { t } = useLanguage()

    useEffect(() => {
        if (isOpen) {
            setTitle(course.title)
            setDescription(course.description || '')
            setColor(course.color)
            setIcon(course.icon || '')
            setIsFavorite(course.isFavorite || false)
        }
    }, [isOpen, course])

    if (!isOpen) return null

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        const { courseQueries } = await import('@/lib/api/queries')
        if (course.id) {
            await courseQueries.update(String(course.id), {
                title,
                description,
                color,
                icon,
                isFavorite
            })
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleUpdate} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.create.name')}</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-md">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">Favorite Course</label>
                            <p className="text-xs text-muted-foreground">Pin this course to your dashboard.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFavorite(!isFavorite)}
                            className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isFavorite ? "bg-primary" : "bg-input"
                            )}
                        >
                            <span
                                className={cn(
                                    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                                    isFavorite ? "translate-x-5" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('course.create.desc')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color Tag</label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => { setColor(c); setIcon('') }} // Clear icon if color selected (optional preference, but let's allow both or prioritize one)
                                        className={cn(
                                            "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                            color === c && !icon && "ring-2 ring-offset-2 ring-primary scale-110"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
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
                                        "h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors",
                                        icon === emoji && "bg-primary/20 ring-1 ring-primary"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setIcon('')}
                                className={cn(
                                    "h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-xs text-muted-foreground border border-dashed",
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
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                        >
                            {t('action.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

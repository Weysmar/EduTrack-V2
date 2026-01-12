import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Dumbbell, FileText, FolderOpen } from 'lucide-react'
import { Editor } from './Editor'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useProfileStore } from '@/store/profileStore'
import { itemQueries } from '@/lib/api/queries'
import { Item } from '@/lib/types'
import { toast } from 'sonner' // Requires toast

interface EditItemModalProps {
    isOpen: boolean
    onClose: () => void
    item: Item
    courseId: string
}

export function EditItemModal({ isOpen, onClose, item, courseId }: EditItemModalProps) {
    const { activeProfile } = useProfileStore()
    const [title, setTitle] = useState(item.title)
    const [content, setContent] = useState(item.content || '')
    const [status, setStatus] = useState(item.status || 'todo')
    const [difficulty, setDifficulty] = useState(item.difficulty || 'medium')
    const [file, setFile] = useState<File | null>(null)
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    // Sync state if item changes while modal is open (less likely but good practice)
    useEffect(() => {
        if (isOpen) {
            setTitle(item.title)
            setContent(item.content || '')
            setStatus(item.status || 'todo')
            setDifficulty(item.difficulty || 'medium')
            setFile(null)
        }
    }, [isOpen, item])

    const updateItemMutation = useMutation({
        mutationFn: (data: FormData) => itemQueries.update(String(item.id), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            queryClient.invalidateQueries({ queryKey: ['items', item.id] })
            toast.success(t('item.edit.success'))
            onClose()
        }
    })

    // Handle ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        const formData = new FormData();
        formData.append('title', title);

        // Only append fields if they are relevant to the item type
        if (item.type === 'note' || item.type === 'exercise') {
            formData.append('content', content);
        }

        if (item.type === 'exercise') {
            formData.append('status', status);
            formData.append('difficulty', difficulty);
        }

        // Only append file if a new one is selected
        if (file) {
            formData.append('file', file);
            formData.append('fileName', file.name);
            formData.append('fileSize', file.size.toString());
        }

        try {
            await updateItemMutation.mutateAsync(formData);
        } catch (error) {
            console.error("Update failed:", error)
            toast.error(t('item.edit.error'))
        }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-3 md:p-4 border-b">
                    <h2 className="text-base md:text-lg font-semibold">{t('item.edit.title')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Type Indicator (Not editable) */}
                <div className="flex items-center justify-center py-2 bg-muted/20 border-b text-sm text-muted-foreground gap-2 uppercase tracking-wide font-bold">
                    {item.type === 'note' && <FileText className="h-4 w-4" />}
                    {item.type === 'exercise' && <Dumbbell className="h-4 w-4" />}
                    {item.type === 'resource' && <FolderOpen className="h-4 w-4" />}
                    {t(`item.create.type.${item.type}`)}
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('item.form.title')}</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    {item.type === 'note' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('item.form.content')}</label>
                            <Editor content={content} onChange={setContent} />
                        </div>
                    )}

                    {item.type === 'exercise' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('item.form.status')}</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                    >
                                        <option value="todo">{t('status.todo')}</option>
                                        <option value="in-progress">{t('status.in-progress')}</option>
                                        <option value="completed">{t('status.completed')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('item.form.difficulty')}</label>
                                    <select
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value as any)}
                                        className="w-full px-3 py-2 border rounded-md bg-background"
                                    >
                                        <option value="easy">{t('diff.easy')}</option>
                                        <option value="medium">{t('diff.medium')}</option>
                                        <option value="hard">{t('diff.hard')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('item.form.desc')}</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
                                />
                            </div>

                            {/* Exercise File Upload (Optional) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('item.edit.replaceFile')} ({t('common.optional')})</label>
                                <div className="border border-dashed rounded-lg p-3 text-center hover:bg-muted/5 transition-colors cursor-pointer relative bg-background">
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                                        <FolderOpen className="h-4 w-4" />
                                        <span>{file ? file.name : (item.fileName ? t('item.edit.keepFile') : t('item.edit.drop_file'))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {item.type === 'resource' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('item.form.file')}</label>

                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/5 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium">
                                        {file ? file.name : (item.fileName || t('item.form.file.placeholder'))}
                                    </p>
                                    {file ? (
                                        <p className="text-xs text-green-500 mt-1">{t('item.edit.replaceFile')}</p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground mt-1">{t('item.edit.keepFile')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-md hover:bg-muted transition-colors"
                        >
                            {t('action.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={updateItemMutation.isPending}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                        >
                            {updateItemMutation.isPending ? t('item.edit.save_loading') : t('item.edit.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

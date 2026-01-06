import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Dumbbell, FileText, FolderOpen } from 'lucide-react'
import { Editor } from './Editor'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useProfileStore } from '@/store/profileStore'
import { itemQueries } from '@/lib/api/queries'

type ItemType = 'note' | 'exercise' | 'resource';

interface CreateItemModalProps {
    isOpen: boolean
    onClose: () => void
    courseId: string
    initialFile?: File | null
}

export function CreateItemModal({ isOpen, onClose, courseId, initialFile }: CreateItemModalProps) {
    const { activeProfile } = useProfileStore()
    const [type, setType] = useState<ItemType>(initialFile ? 'resource' : 'note')
    const [title, setTitle] = useState(initialFile ? initialFile.name : '')
    const [content, setContent] = useState('') // For note
    const [status, setStatus] = useState('todo') // For exercise
    const [difficulty, setDifficulty] = useState('medium') // For exercise
    const [file, setFile] = useState<File | null>(initialFile || null) // For resource
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    const createItemMutation = useMutation({
        mutationFn: itemQueries.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            onClose()
            // Reset form
            setTitle('')
            setContent('')
            setFile(null)
            // Keep type maybe?
        }
    })

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
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
        formData.append('type', type);
        formData.append('courseId', courseId);
        if (activeProfile?.id) formData.append('profileId', activeProfile.id);

        if (type === 'note' || type === 'exercise') {
            formData.append('content', content);
        }
        if (type === 'exercise') {
            formData.append('status', status);
            formData.append('difficulty', difficulty);
        }
        if (type === 'resource' && file) {
            formData.append('file', file);
            formData.append('fileName', file.name);
            formData.append('fileType', file.type);
            formData.append('fileSize', file.size.toString());
        }

        try {
            await createItemMutation.mutateAsync(formData);
        } catch (error) {
            console.error(error)
            // Handle error UI
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('item.create.title')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex border-b">
                    {(['note', 'exercise', 'resource'] as const).map(tType => (
                        <button
                            key={tType}
                            type="button"
                            onClick={() => setType(tType)}
                            className={cn(
                                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors capitalize flex items-center justify-center gap-2",
                                type === tType ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            {tType === 'note' && <FileText className="h-4 w-4" />}
                            {tType === 'exercise' && <Dumbbell className="h-4 w-4" />}
                            {tType === 'resource' && <FolderOpen className="h-4 w-4" />}
                            {t(`item.create.type.${tType}`)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('item.form.title')}</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder={`e.g. ${type === 'note' ? 'Lecture Summary' : type === 'exercise' ? 'Calculus Drill 1' : 'Textbook PDF'}`}
                            required
                        />
                    </div>

                    {type === 'note' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('item.form.content')}</label>
                            <Editor content={content} onChange={setContent} />
                        </div>
                    )}

                    {type === 'exercise' && (
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
                                        <option value="in-progress">{t('status.inprogress')}</option>
                                        <option value="completed">{t('status.completed')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('item.form.difficulty')}</label>
                                    <select
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value)}
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
                                    placeholder="Instructions for the exercise..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('item.form.file')}</label>
                                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/5 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <FolderOpen className="h-4 w-4" />
                                        <span className="text-sm">{file ? file.name : t('item.form.file.placeholder')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'resource' && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/5 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-medium">{file ? file.name : t('item.form.file.placeholder')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : t('item.form.file.supports')}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={createItemMutation.isPending}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
                        >
                            {createItemMutation.isPending ? 'Uploading...' : t(`item.form.submit.${type}`)}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Dumbbell, FileText, FolderOpen, Loader2, ArrowRight, Calendar as CalendarIcon, Globe, ExternalLink, Sparkles, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Editor } from './Editor'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useProfileStore } from '@/store/profileStore'
import { itemQueries } from '@/lib/api/queries'
import imageCompression from 'browser-image-compression';
import { GoogleDrivePickerButton } from '@/components/drive/GoogleDrivePickerButton';

type ItemType = 'note' | 'exercise' | 'resource' | 'link';

interface CreateItemModalProps {
    isOpen: boolean
    onClose: () => void
    courseId: string
    initialFile?: File | null
}

export function CreateItemModal({ isOpen, onClose, courseId, initialFile }: CreateItemModalProps) {
    const navigate = useNavigate()
    const { activeProfile } = useProfileStore()
    const [type, setType] = useState<ItemType>(initialFile ? 'resource' : 'note')
    const [title, setTitle] = useState(initialFile ? initialFile.name : '')
    const [content, setContent] = useState('') // For note/exercise
    const [status, setStatus] = useState('todo') // For exercise
    const [difficulty, setDifficulty] = useState('medium') // For exercise
    const [dueDate, setDueDate] = useState('') // For exercise deadline
    const [hasDueDate, setHasDueDate] = useState(false) // For exercise deadline toggle
    const [files, setFiles] = useState<File[]>(initialFile ? [initialFile] : []) // For resource/exercise
    const [linkUrl, setLinkUrl] = useState('')
    const [linkPreview, setLinkPreview] = useState<{ url: string; domain: string; title: string; description: string; image: string; favicon: string } | null>(null)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const { t, language } = useLanguage()
    const queryClient = useQueryClient()

    const fetchUrlPreview = async (rawUrl?: string) => {
        let urlToFetch = (rawUrl !== undefined ? rawUrl : linkUrl).trim()
        if (!urlToFetch) return
        if (!urlToFetch.startsWith('http://') && !urlToFetch.startsWith('https://')) {
            urlToFetch = 'https://' + urlToFetch
        }
        setIsLoadingPreview(true)
        try {
            const preview = await itemQueries.previewUrl(urlToFetch)
            setLinkPreview(preview)
            if (!title.trim() || title === linkUrl || (linkPreview && title === linkPreview.title)) {
                if (preview.title) setTitle(preview.title)
            }
            if (!content.trim() && preview.description) {
                setContent(preview.description)
            }
        } catch (err) {
            console.warn('Failed to preview URL', err)
        } finally {
            setIsLoadingPreview(false)
        }
    }

    const createItemMutation = useMutation({
        mutationFn: (data: any) => itemQueries.create(data, {
            onUploadProgress: (progressEvent: any) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            }
        }),
        onSuccess: (createdItem: any) => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] })
            onClose()
            const itemType = type
            const newId = createdItem?.id
            setTitle('')
            setContent('')
            setDueDate('')
            setHasDueDate(false)
            setFiles([])
            setLinkUrl('')
            setLinkPreview(null)
            setIsLoadingPreview(false)
            setUploadProgress(0)

            if (itemType === 'note' && newId) {
                navigate(`/edu/course/${courseId}/item/${newId}?edit=true`)
            }
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
        if (!title.trim() && (type === 'note' || type === 'exercise')) return

        if (type === 'link') {
            let finalUrl = linkUrl.trim()
            if (!finalUrl) {
                toast.error(language === 'fr' ? "Veuillez entrer une adresse de site web" : "Please enter a website URL")
                return
            }
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = 'https://' + finalUrl
            }

            let domain = linkPreview?.domain || ''
            try {
                if (!domain) domain = new URL(finalUrl).hostname.replace(/^www\./, '')
            } catch {
                domain = finalUrl
            }

            const finalTitle = title.trim() || linkPreview?.title || domain || finalUrl
            const thumbnail = linkPreview?.image || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

            try {
                setIsUploading(true)
                await createItemMutation.mutateAsync({
                    courseId,
                    type: 'link',
                    title: finalTitle,
                    content: content.trim() || linkPreview?.description || '',
                    fileUrl: finalUrl,
                    thumbnailUrl: thumbnail,
                    fileName: domain,
                    profileId: activeProfile?.id
                })
            } catch (error) {
                console.error(error)
                toast.error(language === 'fr' ? "Erreur lors de l'ajout du site" : "Failed to add website")
            } finally {
                setIsUploading(false)
            }
            return
        }

        setIsUploading(true)
        setUploadProgress(0)

        if (type === 'resource' && files.length > 0) {
            try {
                let count = 0;
                for (const currentFile of files) {
                    count++;
                    const formData = new FormData();
                    formData.append('type', type);
                    formData.append('courseId', courseId);
                    if (activeProfile?.id) formData.append('profileId', activeProfile.id);

                    const itemTitle = files.length === 1 && title.trim() ? title : currentFile.name.replace(/\.[^/.]+$/, "");
                    formData.append('title', itemTitle);

                    let fileToUpload = currentFile;
                    if (currentFile.type.startsWith('image/')) {
                        try {
                            const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                            fileToUpload = await imageCompression(currentFile, options);
                        } catch (error) {
                            console.error("Image compression failed", error);
                        }
                    }

                    // Attach Google Drive file ID tag if present
                    const driveFileId = (currentFile as any).driveFileId;
                    if (driveFileId) {
                        formData.append('tags', JSON.stringify([`gdrive:${driveFileId}`]));
                    }

                    formData.append('file', fileToUpload);
                    formData.append('fileName', fileToUpload.name);
                    formData.append('fileType', fileToUpload.type);
                    formData.append('fileSize', fileToUpload.size.toString());

                    // Manual API call to track individual file progress
                    await itemQueries.create(formData, {
                        onUploadProgress: (progressEvent: any) => {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            // Combine global progress (file X of N) with current file %
                            const totalProgress = ((count - 1) / files.length * 100) + (percentCompleted / files.length);
                            setUploadProgress(Math.round(totalProgress));
                        }
                    });
                }

                queryClient.invalidateQueries({ queryKey: ['items'] });
                onClose();
                setTitle('');
                setContent('');
                setFiles([]);
            } catch (error) {
                console.error(error);
                toast.error("Upload failed");
            } finally {
                setIsUploading(false)
                setUploadProgress(0)
            }
            return;
        }

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
            if (hasDueDate && dueDate) {
                formData.append('dueDate', new Date(dueDate).toISOString());
            }

            if (files.length > 0) {
                let fileToUpload = files[0];
                if (files[0].type.startsWith('image/')) {
                    try {
                        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                        fileToUpload = await imageCompression(files[0], options);
                    } catch (error) {
                        console.error("Image compression failed", error);
                    }
                }

                const driveFileId = (files[0] as any).driveFileId;
                if (driveFileId) {
                    formData.append('tags', JSON.stringify([`gdrive:${driveFileId}`]));
                }

                formData.append('file', fileToUpload);
                formData.append('fileName', fileToUpload.name);
                formData.append('fileType', fileToUpload.type);
                formData.append('fileSize', fileToUpload.size.toString());
            }
        }

        try {
            await createItemMutation.mutateAsync(formData);
        } catch (error) {
            console.error(error)
        } finally {
            setIsUploading(false)
            setUploadProgress(0)
        }
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{t('item.create.title')}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex border-b">
                    {(['note', 'exercise', 'resource', 'link'] as const).map(tType => (
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
                            {tType === 'link' && <Globe className="h-4 w-4" />}
                            {t(`item.create.type.${tType}`) || (tType === 'link' ? "Internet" : tType)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                    {type !== 'resource' && type !== 'link' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('item.form.title')}</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder={t(`item.form.title.placeholder.${type}`)}
                                autoFocus
                                required
                            />
                        </div>
                    )}

                    {type === 'resource' && files.length <= 1 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('item.form.title')}</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder={files.length === 1 ? files[0].name : t(`item.form.title.placeholder.${type}`)}
                            />
                        </div>
                    )}

                    {type === 'note' && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <span>
                                {language === 'fr'
                                    ? "Donnez un titre à votre note puis cliquez ci-dessous pour ouvrir directement la page de rédaction grand format."
                                    : "Give your note a title and click below to open the full-screen writing page."}
                            </span>
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
                                        <option value="in-progress">{t('status.in-progress')}</option>
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

                            {/* Échéance de l'exercice avec case optionnelle */}
                            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 transition-all">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={hasDueDate}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            setHasDueDate(checked);
                                            if (checked && !dueDate) {
                                                setDueDate(format(new Date(), 'yyyy-MM-dd'));
                                            } else if (!checked) {
                                                setDueDate('');
                                            }
                                        }}
                                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                    />
                                    <span className="text-sm font-semibold flex items-center gap-1.5">
                                        <CalendarIcon className="h-4 w-4 text-emerald-500" />
                                        <span>{t('item.form.hasDueDate') || (language === 'fr' ? "Définir une échéance (ajouter à l'agenda)" : "Set a deadline (add to calendar)")}</span>
                                    </span>
                                </label>

                                {hasDueDate && (
                                    <div className="pt-1.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                                            required={hasDueDate}
                                        />
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                                            <span>📅</span>
                                            <span>
                                                {t('item.form.dueDate.hint') || (language === 'fr'
                                                    ? "Cet exercice sera automatiquement ajouté à votre agenda pour cette date."
                                                    : "This exercise will automatically be added to your calendar for this date.")}
                                            </span>
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('item.form.desc')}</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
                                    placeholder={t('item.form.instructions.placeholder')}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">{t('item.form.file')}</label>
                                    <GoogleDrivePickerButton
                                        onFilesSelected={picked => {
                                            if (picked.length > 0) {
                                                setFiles([picked[0]]);
                                                if (!title.trim()) setTitle(picked[0].name.replace(/\.[^/.]+$/, ""));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/5 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        onChange={e => setFiles(e.target.files?.[0] ? [e.target.files[0]] : [])}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <FolderOpen className="h-4 w-4" />
                                        <span className="text-sm">{files[0] ? files[0].name : t('item.form.file.placeholder')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'link' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center justify-between">
                                    <span>{language === 'fr' ? "Adresse du site internet (URL)" : "Website URL"}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {language === 'fr' ? "La vignette et le titre seront détectés automatiquement" : "Thumbnail and title detected automatically"}
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="url"
                                            value={linkUrl}
                                            onChange={e => setLinkUrl(e.target.value)}
                                            onBlur={() => {
                                                if (linkUrl.trim() && !linkPreview) fetchUrlPreview()
                                            }}
                                            onPaste={e => {
                                                const pasted = e.clipboardData.getData('text')
                                                if (pasted && (pasted.startsWith('http') || pasted.includes('.'))) {
                                                    fetchUrlPreview(pasted)
                                                }
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    fetchUrlPreview()
                                                }
                                            }}
                                            className="w-full pl-9 pr-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono"
                                            placeholder="https://fr.wikipedia.org/wiki/... ou https://..."
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fetchUrlPreview()}
                                        disabled={isLoadingPreview || !linkUrl.trim()}
                                        className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-md border flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                        title={language === 'fr' ? "Récupérer la vignette et le titre" : "Fetch preview"}
                                    >
                                        {isLoadingPreview ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                        )}
                                        <span>{language === 'fr' ? "Détecter" : "Fetch"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Live Website Preview Card */}
                            {(linkPreview || isLoadingPreview) && (
                                <div className="p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm space-y-3 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-2 border-b">
                                        <span className="flex items-center gap-1.5 text-primary font-semibold">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            <span>{language === 'fr' ? "Aperçu de la vignette et informations" : "Website preview"}</span>
                                        </span>
                                        {linkPreview?.domain && (
                                            <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded">
                                                {linkPreview.domain}
                                            </span>
                                        )}
                                    </div>

                                    {isLoadingPreview ? (
                                        <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span>{language === 'fr' ? "Chargement de la vignette du site..." : "Loading website thumbnail..."}</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4 items-start">
                                            <div className="w-24 h-20 sm:w-28 sm:h-20 rounded-lg overflow-hidden border bg-muted flex-shrink-0 flex items-center justify-center relative shadow-sm">
                                                {linkPreview?.image ? (
                                                    <img
                                                        src={linkPreview.image}
                                                        alt={linkPreview.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <Globe className="h-8 w-8 text-cyan-500 opacity-60" />
                                                )}
                                                <div className="absolute bottom-1 right-1">
                                                    <img
                                                        src={linkPreview?.favicon}
                                                        alt="favicon"
                                                        className="w-4 h-4 rounded-sm bg-white/90 p-0.5 shadow-sm"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
                                                    {linkPreview?.title || title || linkPreview?.domain}
                                                </h4>
                                                {linkPreview?.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {linkPreview.description}
                                                    </p>
                                                )}
                                                {linkPreview?.url && (
                                                    <a
                                                        href={linkPreview.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono pt-1"
                                                    >
                                                        <span>{linkPreview.url}</span>
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Title Field (Editable) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('item.form.title')}</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    placeholder={language === 'fr' ? "Titre affiché pour ce contenu" : "Title displayed for this item"}
                                    required
                                />
                            </div>

                            {/* Optional Description / Notes */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    <span>{t('item.form.desc')}</span>
                                    <span className="text-xs text-muted-foreground font-normal ml-1.5">({t('common.optional')})</span>
                                </label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md bg-background min-h-[70px] text-sm"
                                    placeholder={language === 'fr' ? "Description ou remarques personnelles sur ce site..." : "Description or notes about this website..."}
                                />
                            </div>
                        </div>
                    )}

                    {type === 'resource' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Sélectionnez vos fichiers locaux ou Google Drive</span>
                                <GoogleDrivePickerButton
                                    onFilesSelected={picked => {
                                        if (picked.length > 0) {
                                            setFiles(prev => [...prev, ...picked]);
                                            if (files.length === 0 && picked.length === 1 && !title.trim()) {
                                                setTitle(picked[0].name.replace(/\.[^/.]+$/, ""));
                                            }
                                        }
                                    }}
                                />
                            </div>

                            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/5 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    multiple
                                    onChange={e => setFiles(Array.from(e.target.files || []))}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-medium">
                                    {files.length > 0
                                        ? `${files.length} fichier(s) sélectionné(s)`
                                        : t('item.form.file.placeholder')}
                                </p>
                                {files.length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        {files.map(f => f.name).join(', ').substring(0, 50)}
                                        {files.map(f => f.name).join(', ').length > 50 && '...'}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                    {files.length > 0
                                        ? `${(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1)} MB total`
                                        : t('item.form.file.supports')}
                                </p>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-muted-foreground">{t('common.uploading') || "Téléchargement..."}</span>
                                <span className="text-primary">{uploadProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={createItemMutation.isPending || isUploading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 min-w-[120px] flex items-center justify-center gap-2"
                        >
                            {(createItemMutation.isPending || isUploading) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : type === 'note' ? (
                                <>
                                    <span>{language === 'fr' ? "Créer et rédiger" : "Create & Write"}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            ) : (
                                <span>{isUploading ? (t('common.uploading') || "Upload...") : (type === 'link' ? (language === 'fr' ? "Ajouter le site" : "Add Website") : t(`item.form.submit.${type}`))}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    )
}

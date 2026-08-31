import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Folder, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { folderQueries } from '@/lib/api/queries'
import { useLanguage } from '@/components/language-provider'

interface EditFolderModalProps {
    isOpen: boolean
    onClose: () => void
    folder: { id: string | number; name: string } | null
    onSuccess?: (newName: string) => void
}

export function EditFolderModal({ isOpen, onClose, folder, onSuccess }: EditFolderModalProps) {
    const { t } = useLanguage()
    const [name, setName] = useState('')
    const queryClient = useQueryClient()

    useEffect(() => {
        if (folder) {
            setName(folder.name || '')
        }
    }, [folder, isOpen])

    const updateFolderMutation = useMutation({
        mutationFn: async (newName: string) => {
            if (!folder) return
            return folderQueries.update(String(folder.id), { name: newName })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            if (folder) {
                queryClient.invalidateQueries({ queryKey: ['folders', String(folder.id)] })
            }
            toast.success(t('folder.update.success') || "Dossier renommé avec succès")
            onSuccess?.(name.trim())
            onClose()
        },
        onError: (error) => {
            console.error('Failed to update folder:', error)
            toast.error(t('folder.update.error') || "Erreur lors du renommage du dossier")
        }
    })

    if (!isOpen || !folder) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            toast.error("Le nom du dossier ne peut pas être vide")
            return
        }
        updateFolderMutation.mutate(trimmed)
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                        <Folder className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">
                            {t('folder.edit.title') || "Renommer le dossier"}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Modifiez le nom de ce dossier
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Nom du dossier
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom du dossier"
                            autoFocus
                            disabled={updateFolderMutation.isPending}
                            className="w-full px-3.5 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={updateFolderMutation.isPending}
                            className="px-4 py-2 rounded-lg border hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {t('action.cancel') || "Annuler"}
                        </button>
                        <button
                            type="submit"
                            disabled={updateFolderMutation.isPending || !name.trim() || name.trim() === folder.name}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {updateFolderMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Enregistrement...</span>
                                </>
                            ) : (
                                <span>{t('action.save') || "Enregistrer"}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

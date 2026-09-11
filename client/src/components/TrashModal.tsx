import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemQueries } from '@/lib/api/queries';
import {
    X,
    Trash2,
    RotateCcw,
    FileText,
    Dumbbell,
    File,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Folder
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrashModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCourseId?: string;
}

export function TrashModal({ isOpen, onClose, currentCourseId }: TrashModalProps) {
    const queryClient = useQueryClient();
    const [filterCourseOnly, setFilterCourseOnly] = useState(false);
    const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

    const {
        data: trashedItems = [],
        isLoading,
        refetch
    } = useQuery({
        queryKey: ['trashItems'],
        queryFn: () => itemQueries.getTrash(),
        enabled: isOpen
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => itemQueries.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['trashItems'] });
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            toast.success("Élément restauré avec succès !");
        },
        onError: () => {
            toast.error("Échec de la restauration de l'élément");
        },
        onSettled: () => {
            setActionInProgressId(null);
        }
    });

    const permanentDeleteMutation = useMutation({
        mutationFn: (id: string) => itemQueries.permanentDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trashItems'] });
            toast.success("Élément supprimé définitivement");
        },
        onError: () => {
            toast.error("Échec de la suppression définitive");
        },
        onSettled: () => {
            setActionInProgressId(null);
        }
    });

    const emptyTrashMutation = useMutation({
        mutationFn: () => itemQueries.emptyTrash(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trashItems'] });
            toast.success("La corbeille a été vidée");
        },
        onError: () => {
            toast.error("Échec du vidage de la corbeille");
        }
    });

    if (!isOpen) return null;

    const displayedItems = filterCourseOnly && currentCourseId
        ? trashedItems.filter((i: any) => i.courseId === currentCourseId)
        : trashedItems;

    const handleRestore = (id: string) => {
        setActionInProgressId(id);
        restoreMutation.mutate(id);
    };

    const handlePermanentDelete = (id: string, title: string) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${title}" ?\nCette action est irréversible et le fichier sera effacé du disque.`)) {
            setActionInProgressId(id);
            permanentDeleteMutation.mutate(id);
        }
    };

    const handleEmptyTrash = () => {
        if (confirm(`Voulez-vous vraiment vider l'ensemble de la corbeille (${trashedItems.length} éléments) ?\nTous les fichiers associés seront définitivement effacés.`)) {
            emptyTrashMutation.mutate();
        }
    };

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'note':
                return <FileText className="h-4 w-4 text-blue-500" />;
            case 'exercise':
                return <Dumbbell className="h-4 w-4 text-orange-500" />;
            default:
                return <File className="h-4 w-4 text-emerald-500" />;
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold">Corbeille</h2>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                                    {trashedItems.length}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Restaurez en un clic les documents ou fichiers supprimés par erreur.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Sub-header Controls */}
                <div className="flex items-center justify-between px-6 py-2.5 border-b bg-muted/5 text-xs">
                    {currentCourseId ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilterCourseOnly(false)}
                                className={`px-2.5 py-1 rounded-md transition-colors ${!filterCourseOnly ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                            >
                                Tous ({trashedItems.length})
                            </button>
                            <button
                                onClick={() => setFilterCourseOnly(true)}
                                className={`px-2.5 py-1 rounded-md transition-colors ${filterCourseOnly ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                            >
                                Ce cours uniquement ({trashedItems.filter((i: any) => i.courseId === currentCourseId).length})
                            </button>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Historique des éléments supprimés récemment</span>
                    )}

                    {trashedItems.length > 0 && (
                        <button
                            onClick={handleEmptyTrash}
                            disabled={emptyTrashMutation.isPending}
                            className="text-destructive hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
                        >
                            {emptyTrashMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Trash2 className="h-3 w-3" />
                            )}
                            <span>Vider la corbeille</span>
                        </button>
                    )}
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[250px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm">Chargement de la corbeille...</p>
                        </div>
                    ) : displayedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground text-sm">La corbeille est vide</p>
                                <p className="text-xs max-w-xs mt-1">
                                    Aucun document n'a été mis à la corbeille. Vos cours et fichiers sont en sécurité.
                                </p>
                            </div>
                        </div>
                    ) : (
                        displayedItems.map((item: any) => {
                            const isProcessing = actionInProgressId === item.id;
                            const title = item.title || item.fileName || 'Document sans titre';
                            const deletedDate = item.deletedAt
                                ? format(new Date(item.deletedAt), "d MMMM yyyy à HH:mm", { locale: fr })
                                : null;

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card/60 hover:bg-muted/30 transition-all gap-3"
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="p-2 rounded-lg bg-muted/60 flex-shrink-0 mt-0.5">
                                            {getItemIcon(item.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm truncate text-foreground">
                                                {title}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                                {item.course?.title && (
                                                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                                                        <Folder className="h-3 w-3" style={{ color: item.course.color }} />
                                                        {item.course.title}
                                                    </span>
                                                )}
                                                {item.fileName && (
                                                    <span className="truncate max-w-[150px]">
                                                        • {item.fileName}
                                                    </span>
                                                )}
                                                {deletedDate && (
                                                    <span className="text-muted-foreground/70">
                                                        • Supprimé le {deletedDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                        <button
                                            onClick={() => handleRestore(item.id)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                                            title="Restaurer cet élément dans son cours"
                                        >
                                            {isProcessing && restoreMutation.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <RotateCcw className="h-3.5 w-3.5" />
                                            )}
                                            <span>Restaurer</span>
                                        </button>

                                        <button
                                            onClick={() => handlePermanentDelete(item.id, title)}
                                            disabled={isProcessing}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                            title="Supprimer définitivement"
                                        >
                                            {isProcessing && permanentDeleteMutation.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Les éléments restaurés retrouvent instantanément leur place d'origine.
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

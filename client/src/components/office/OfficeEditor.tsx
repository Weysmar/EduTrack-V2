import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import {
    Save,
    ArrowLeft,
    Download,
    FileText,
    Loader2,
    Copy,
    CheckCircle2
} from 'lucide-react';
import { Editor } from '@/components/Editor';
import { convertDocxToHtml, convertOdtToHtml, convertHtmlToDocxBlob, extractTextFromHtml } from '@/lib/office/docxConverter';
import { itemQueries } from '@/lib/api/queries';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

interface OfficeEditorProps {
    item: any;
    fileUrl: string;
    onClose: () => void;
    onSaveSuccess?: () => void;
    className?: string;
}

export function OfficeEditor({ item, fileUrl, onClose, onSaveSuccess, className }: OfficeEditorProps) {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const ext = (item?.fileName?.split('.').pop() || '').toLowerCase();
    const isOdt = ext === 'odt';

    const [content, setContent] = useState<string>(item?.content || '');
    const [isLoading, setIsLoading] = useState(!item?.content);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initial conversion from document binary if item.content is empty
    useEffect(() => {
        let isMounted = true;

        async function loadDocument() {
            if (item?.content && item.content.trim().length > 0) {
                setContent(item.content);
                setIsLoading(false);
                return;
            }

            if (!fileUrl) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    throw new Error(`Erreur de téléchargement du fichier (${response.status})`);
                }

                const arrayBuffer = await response.arrayBuffer();
                let html = '';

                if (isOdt) {
                    html = await convertOdtToHtml(arrayBuffer);
                } else {
                    html = await convertDocxToHtml(arrayBuffer);
                }

                if (isMounted) {
                    setContent(html);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to load & convert Office document:', error);
                if (isMounted) {
                    toast.error('Impossible de convertir le document pour édition', {
                        description: error instanceof Error ? error.message : 'Format non supporté'
                    });
                    setIsLoading(false);
                }
            }
        }

        loadDocument();

        return () => {
            isMounted = false;
        };
    }, [fileUrl, item?.content, isOdt]);

    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        setHasUnsavedChanges(true);
    }, []);

    // Save changes back to server (updates both stored .docx and item content/text)
    const handleSave = async () => {
        if (!content || isSaving) return;

        setIsSaving(true);
        try {
            // 1. Generate updated .docx blob
            const docxBlob = await convertHtmlToDocxBlob(content, item?.title || 'Document');
            const fileName = item?.fileName?.replace(/\.(odt|doc)$/i, '.docx') || 'document.docx';
            const updatedFile = new File([docxBlob], fileName, {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            // 2. Extract plain text for AI and search indexing
            const plainText = extractTextFromHtml(content);

            // 3. Prepare FormData for item update
            const formData = new FormData();
            formData.append('file', updatedFile);
            formData.append('content', content);
            formData.append('extractedContent', plainText);
            formData.append('fileType', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            await itemQueries.update(item.id, formData);

            // Invalidate React Query cache
            queryClient.invalidateQueries({ queryKey: ['item', item.id] });
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });

            setHasUnsavedChanges(false);
            toast.success('Document Word enregistré avec succès !', {
                description: 'Le fichier Word et les contenus d’analyse ont été mis à jour.'
            });

            onSaveSuccess?.();
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Erreur lors de l’enregistrement du document');
        } finally {
            setIsSaving(false);
        }
    };

    // Export current editor content directly as .docx
    const handleExportDocx = async () => {
        if (!content || isExporting) return;
        setIsExporting(true);
        try {
            const blob = await convertHtmlToDocxBlob(content, item?.title || 'Document');
            const rawTitle = (item?.title || 'document').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'document';
            saveAs(blob, `${rawTitle}_edite.docx`);
            toast.success('Fichier Word téléchargé');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Erreur lors du téléchargement');
        } finally {
            setIsExporting(false);
        }
    };

    // Duplicate as a standalone EduTrack Note
    const handleDuplicateAsNote = async () => {
        if (!content || isDuplicating) return;
        setIsDuplicating(true);
        try {
            const plainText = extractTextFromHtml(content);
            await itemQueries.create({
                courseId: item.courseId,
                title: `${item.title || 'Document'} (Note)`,
                type: 'note',
                content,
                extractedContent: plainText
            });

            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['course', item.courseId] });
            toast.success('Copié comme Note dans votre cours !');
        } catch (error) {
            console.error('Duplicate error:', error);
            toast.error('Erreur lors de la duplication en note');
        } finally {
            setIsDuplicating(false);
        }
    };

    // Ctrl+S / Cmd+S shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [content, isSaving]);

    return (
        <div className={cn("flex flex-col h-full bg-slate-100/80 dark:bg-slate-950 overflow-hidden", className)}>
            {/* Top Toolbar Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-card border-b shadow-xs sticky top-0 z-30">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs font-medium"
                        title="Retour au document"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Retour</span>
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                            {ext.toUpperCase() || 'WORD'} • ÉDITEUR
                        </span>
                        <span className="font-semibold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
                            {item?.title || item?.fileName}
                        </span>
                    </div>

                    {hasUnsavedChanges ? (
                        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Modifications non enregistrées
                        </span>
                    ) : (
                        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            À jour
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDuplicateAsNote}
                        disabled={isDuplicating || isLoading}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                        title="Créer une note indépendante dans ce cours"
                    >
                        {isDuplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                        <span className="hidden lg:inline">Dupliquer en Note</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportDocx}
                        disabled={isExporting || isLoading}
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center gap-1.5"
                        title="Télécharger le fichier .docx modifié"
                    >
                        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">Télécharger .docx</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className={cn(
                            "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all",
                            hasUnsavedChanges
                                ? "bg-primary text-primary-foreground hover:opacity-90 ring-2 ring-primary/30"
                                : "bg-primary/90 text-primary-foreground hover:bg-primary"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Enregistrement...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-3.5 w-3.5" />
                                <span>Enregistrer</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Editor Container with A4 Paper Canvas */}
            <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-6 scrollbar-thin">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">
                            Conversion du document Word pour l’édition en cours...
                        </p>
                    </div>
                ) : (
                    <div className="max-w-[21.5cm] min-h-[29.7cm] mx-auto bg-white text-slate-900 shadow-xl rounded-md p-6 sm:p-12 border border-slate-200 dark:border-slate-800 transition-all">
                        <Editor
                            content={content}
                            onChange={handleContentChange}
                            editable={true}
                            className="min-h-[25cm] text-slate-900"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

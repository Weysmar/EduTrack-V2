import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { itemQueries } from '@/lib/api/queries';
import {
    AnnotationTool,
    AnnotationItem,
    DocumentAnnotations
} from '@/types/annotations';

interface UseAnnotationsOptions {
    itemId: string;
    initialAnnotations?: any;
    onSaveSuccess?: () => void;
}

const EMPTY_ANNOTATIONS: DocumentAnnotations = {
    version: 1,
    pages: {}
};

export function useAnnotations({ itemId, initialAnnotations, onSaveSuccess }: UseAnnotationsOptions) {
    // Parse initial data safely
    const parseInitial = (): DocumentAnnotations => {
        if (!initialAnnotations) return EMPTY_ANNOTATIONS;
        try {
            if (typeof initialAnnotations === 'string') {
                const parsed = JSON.parse(initialAnnotations);
                return parsed?.pages ? parsed : { version: 1, pages: parsed };
            }
            if (typeof initialAnnotations === 'object' && initialAnnotations !== null) {
                return initialAnnotations.pages ? initialAnnotations : { version: 1, pages: initialAnnotations };
            }
        } catch (e) {
            console.warn('Failed to parse initial annotations:', e);
        }
        return EMPTY_ANNOTATIONS;
    };

    const [annotations, setAnnotations] = useState<DocumentAnnotations>(parseInitial);
    const [activeTool, setActiveTool] = useState<AnnotationTool>('pointer');
    const [activeColor, setActiveColor] = useState<string>('#eab308');
    const [strokeWidth, setStrokeWidth] = useState<number>(4);
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // History for Undo / Redo
    const [history, setHistory] = useState<DocumentAnnotations[]>([parseInitial()]);
    const [historyIndex, setHistoryIndex] = useState<number>(0);

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstMount = useRef(true);

    // Update if itemId changes or initialAnnotations updates externally
    useEffect(() => {
        if (!isFirstMount.current) {
            const parsed = parseInitial();
            setAnnotations(parsed);
            setHistory([parsed]);
            setHistoryIndex(0);
        }
    }, [itemId]);

    // Push new state into history
    const pushHistory = useCallback((nextAnnotations: DocumentAnnotations) => {
        setHistory(prev => {
            const nextHistory = prev.slice(0, historyIndex + 1);
            if (nextHistory.length > 25) nextHistory.shift(); // Limit to 25 history steps
            return [...nextHistory, nextAnnotations];
        });
        setHistoryIndex(prev => Math.min(prev + 1, 25));
    }, [historyIndex]);

    // Debounced Backend Auto-save
    const triggerAutoSave = useCallback((dataToSave: DocumentAnnotations) => {
        if (!itemId) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setIsSaving(true);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await itemQueries.saveAnnotations(itemId, dataToSave);
                setIsSaving(false);
                setLastSaved(new Date());
                if (onSaveSuccess) onSaveSuccess();
            } catch (err: any) {
                console.error('Failed to auto-save annotations:', err);
                setIsSaving(false);
                toast.error("Erreur de sauvegarde des annotations", {
                    description: "Les modifications sont conservées localement."
                });
            }
        }, 1200);
    }, [itemId, onSaveSuccess]);

    // Immediate Backend Save (used for explicit actions like Clear)
    const saveImmediately = useCallback(async (dataToSave: DocumentAnnotations) => {
        if (!itemId) return;
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        setIsSaving(true);
        try {
            await itemQueries.saveAnnotations(itemId, dataToSave);
            setIsSaving(false);
            setLastSaved(new Date());
            if (onSaveSuccess) onSaveSuccess();
        } catch (err: any) {
            console.error('Failed to save annotations immediately:', err);
            setIsSaving(false);
            toast.error("Erreur d'enregistrement", {
                description: "Les modifications sont conservées localement."
            });
        }
    }, [itemId, onSaveSuccess]);

    // Add an annotation to a specific page
    const addAnnotation = useCallback((pageNumber: string | number, item: AnnotationItem) => {
        const pageKey = String(pageNumber);
        setAnnotations(prev => {
            const currentList = prev.pages[pageKey] || [];
            const nextAnnotations: DocumentAnnotations = {
                ...prev,
                pages: {
                    ...prev.pages,
                    [pageKey]: [...currentList, item]
                },
                lastModified: new Date().toISOString()
            };
            pushHistory(nextAnnotations);
            triggerAutoSave(nextAnnotations);
            return nextAnnotations;
        });
    }, [pushHistory, triggerAutoSave]);

    // Update an existing annotation on a page
    const updateAnnotation = useCallback((pageNumber: string | number, item: AnnotationItem) => {
        const pageKey = String(pageNumber);
        setAnnotations(prev => {
            const currentList = prev.pages[pageKey] || [];
            const nextAnnotations: DocumentAnnotations = {
                ...prev,
                pages: {
                    ...prev.pages,
                    [pageKey]: currentList.map(i => i.id === item.id ? item : i)
                },
                lastModified: new Date().toISOString()
            };
            pushHistory(nextAnnotations);
            triggerAutoSave(nextAnnotations);
            return nextAnnotations;
        });
    }, [pushHistory, triggerAutoSave]);

    // Delete a specific annotation
    const deleteAnnotation = useCallback((pageNumber: string | number, id: string) => {
        const pageKey = String(pageNumber);
        setAnnotations(prev => {
            const currentList = prev.pages[pageKey] || [];
            const nextAnnotations: DocumentAnnotations = {
                ...prev,
                pages: {
                    ...prev.pages,
                    [pageKey]: currentList.filter(i => i.id !== id)
                },
                lastModified: new Date().toISOString()
            };
            pushHistory(nextAnnotations);
            triggerAutoSave(nextAnnotations);
            return nextAnnotations;
        });
    }, [pushHistory, triggerAutoSave]);

    // Clear all annotations on a given page
    const clearPage = useCallback((pageNumber: string | number) => {
        const pageKey = String(pageNumber);
        setAnnotations(prev => {
            const currentList = prev.pages[pageKey];
            if (!currentList || currentList.length === 0) return prev;
            const nextAnnotations: DocumentAnnotations = {
                ...prev,
                pages: {
                    ...prev.pages,
                    [pageKey]: []
                },
                lastModified: new Date().toISOString()
            };
            pushHistory(nextAnnotations);
            saveImmediately(nextAnnotations);
            return nextAnnotations;
        });
    }, [pushHistory, saveImmediately]);

    // Clear ALL annotations across all pages of the document
    const clearAll = useCallback(() => {
        setAnnotations(prev => {
            const hasAny = Object.values(prev.pages || {}).some(list => Array.isArray(list) && list.length > 0);
            if (!hasAny) return prev;
            const nextAnnotations: DocumentAnnotations = {
                ...prev,
                pages: {},
                lastModified: new Date().toISOString()
            };
            pushHistory(nextAnnotations);
            saveImmediately(nextAnnotations);
            return nextAnnotations;
        });
    }, [pushHistory, saveImmediately]);

    // Undo
    const canUndo = historyIndex > 0;
    const undo = useCallback(() => {
        if (!canUndo) return;
        const prevIndex = historyIndex - 1;
        const prevAnnotations = history[prevIndex];
        setHistoryIndex(prevIndex);
        setAnnotations(prevAnnotations);
        triggerAutoSave(prevAnnotations);
    }, [canUndo, historyIndex, history, triggerAutoSave]);

    // Redo
    const canRedo = historyIndex < history.length - 1;
    const redo = useCallback(() => {
        if (!canRedo) return;
        const nextIndex = historyIndex + 1;
        const nextAnnotations = history[nextIndex];
        setHistoryIndex(nextIndex);
        setAnnotations(nextAnnotations);
        triggerAutoSave(nextAnnotations);
    }, [canRedo, historyIndex, history, triggerAutoSave]);

    // Toggle Visibility
    const toggleVisibility = useCallback(() => {
        setIsVisible(prev => !prev);
    }, []);

    // Clean up timeout
    useEffect(() => {
        isFirstMount.current = false;
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    return {
        annotations,
        setAnnotations,
        activeTool,
        setActiveTool,
        activeColor,
        setActiveColor,
        strokeWidth,
        setStrokeWidth,
        isVisible,
        toggleVisibility,
        isSaving,
        lastSaved,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        clearPage,
        clearAll,
        undo,
        redo,
        canUndo,
        canRedo
    };
}

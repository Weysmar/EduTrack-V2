import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { itemQueries } from '@/lib/api/queries';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import {
    X,
    Search,
    Columns,
    FileText,
    Image as ImageIcon,
    File,
    Folder,
    Loader2,
    Check,
    FileCode
} from 'lucide-react';

interface SideBySidePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCourseId?: string;
    currentItemId?: string;
    onSelectItem: (item: any) => void;
}

export function SideBySidePickerModal({
    isOpen,
    onClose,
    currentCourseId,
    currentItemId,
    onSelectItem
}: SideBySidePickerModalProps) {
    const { language } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterScope, setFilterScope] = useState<'course' | 'all'>(currentCourseId ? 'course' : 'all');
    const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'images'>('pdf');

    // Fetch items from current course
    const { data: courseData, isLoading: isCourseLoading } = useQuery({
        queryKey: ['items', 'course', currentCourseId],
        queryFn: () => itemQueries.getByCourse(currentCourseId, 1, 100),
        enabled: isOpen && !!currentCourseId && filterScope === 'course',
    });

    // Fetch items from all courses
    const { data: allData, isLoading: isAllLoading } = useQuery({
        queryKey: ['items', 'all', 'side-by-side'],
        queryFn: () => itemQueries.getAll(1, 150),
        enabled: isOpen && filterScope === 'all',
    });

    const isLoading = filterScope === 'course' ? isCourseLoading : isAllLoading;

    // Extract raw items
    const rawItems: any[] = useMemo(() => {
        if (filterScope === 'course') {
            return courseData?.items || (Array.isArray(courseData) ? courseData : []);
        }
        return allData?.items || (Array.isArray(allData) ? allData : []);
    }, [filterScope, courseData, allData]);

    // Helper: Determine file type
    const getFileExt = (item: any): string => {
        const name = (item?.fileName || item?.fileUrl || item?.title || '').toLowerCase();
        const parts = name.split('.');
        return parts.length > 1 ? parts.pop() || '' : '';
    };

    const isPdfItem = (item: any): boolean => {
        const ext = getFileExt(item);
        return ext === 'pdf' || item?.fileType === 'application/pdf';
    };

    const isImageItem = (item: any): boolean => {
        const ext = getFileExt(item);
        return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic'].includes(ext) ||
            Boolean(item?.fileType?.startsWith('image/'));
    };

    // Filter items: exclude current item, apply search and file type filters
    const filteredItems = useMemo(() => {
        return rawItems.filter(item => {
            // Exclude current document and soft-deleted items
            if (item.id === currentItemId || item.deletedAt) return false;

            // Must have a file or content
            const hasFile = Boolean(item.fileUrl || item.storageKey || item.fileData);
            if (!hasFile) return false;

            // File type filter
            if (fileTypeFilter === 'pdf' && !isPdfItem(item)) return false;
            if (fileTypeFilter === 'images' && !isImageItem(item)) return false;

            // Text search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = (item.title || '').toLowerCase().includes(q);
                const fileMatch = (item.fileName || '').toLowerCase().includes(q);
                const courseMatch = (item.course?.title || '').toLowerCase().includes(q);
                if (!titleMatch && !fileMatch && !courseMatch) return false;
            }

            return true;
        });
    }, [rawItems, currentItemId, fileTypeFilter, searchQuery]);

    if (!isOpen) return null;

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getItemIcon = (item: any) => {
        if (isPdfItem(item)) {
            return <FileText className="h-5 w-5 text-red-500" />;
        }
        if (isImageItem(item)) {
            return <ImageIcon className="h-5 w-5 text-purple-500" />;
        }
        return <File className="h-5 w-5 text-blue-500" />;
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Columns className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold">
                                {language === 'fr' ? 'Affichage Côte à Côte' : 'Side-by-Side Display'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {language === 'fr'
                                    ? 'Choisissez un second document à afficher simultanément'
                                    : 'Select a second document to view alongside'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="p-4 border-b space-y-3 bg-card">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={language === 'fr' ? 'Rechercher un document...' : 'Search documents...'}
                            className="w-full pl-9 pr-3 py-2 bg-muted/30 border rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Scope & Type Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Scope Filter */}
                        {currentCourseId && (
                            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border text-xs">
                                <button
                                    type="button"
                                    onClick={() => setFilterScope('course')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                                        filterScope === 'course'
                                            ? "bg-card text-foreground shadow-2xs font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {language === 'fr' ? 'Ce cours' : 'This course'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterScope('all')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                                        filterScope === 'all'
                                            ? "bg-card text-foreground shadow-2xs font-semibold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {language === 'fr' ? 'Tous les cours' : 'All courses'}
                                </button>
                            </div>
                        )}

                        {/* File Type Tabs */}
                        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border text-xs">
                            <button
                                type="button"
                                onClick={() => setFileTypeFilter('pdf')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                                    fileTypeFilter === 'pdf'
                                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                PDF (recommandé)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFileTypeFilter('images')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                                    fileTypeFilter === 'images'
                                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {language === 'fr' ? 'Images' : 'Images'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFileTypeFilter('all')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                                    fileTypeFilter === 'all'
                                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {language === 'fr' ? 'Tous' : 'All'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[250px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs font-medium">
                                {language === 'fr' ? 'Chargement des documents...' : 'Loading documents...'}
                            </span>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-center px-4 space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                                <FileText className="h-6 w-6 opacity-40" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    {language === 'fr' ? 'Aucun document trouvé' : 'No documents found'}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {searchQuery
                                        ? (language === 'fr' ? 'Essayez un autre mot-clé ou élargissez les filtres.' : 'Try another search term or expand filters.')
                                        : (language === 'fr' ? 'Aucun autre document importé dans ce cours.' : 'No other document in this course.')}
                                </p>
                            </div>
                            {filterScope === 'course' && (
                                <button
                                    type="button"
                                    onClick={() => setFilterScope('all')}
                                    className="text-xs text-primary font-semibold hover:underline mt-1"
                                >
                                    {language === 'fr' ? 'Chercher dans tous mes cours' : 'Search across all courses'}
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    onSelectItem(item);
                                    onClose();
                                }}
                                className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="h-10 w-10 rounded-lg bg-card border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                                        {getItemIcon(item)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                            {item.title || item.fileName || 'Sans titre'}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                            {item.course?.title && (
                                                <span className="flex items-center gap-1 truncate max-w-[160px]">
                                                    <Folder className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                                    <span className="truncate">{item.course.title}</span>
                                                </span>
                                            )}
                                            {item.fileName && (
                                                <span className="truncate max-w-[150px] opacity-75 hidden sm:inline">
                                                    {item.fileName}
                                                </span>
                                            )}
                                            {item.fileSize && (
                                                <span className="opacity-75 shrink-0">
                                                    • {formatFileSize(item.fileSize)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-3 shrink-0">
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
                                        <Columns className="h-3.5 w-3.5" />
                                        <span>{language === 'fr' ? 'Afficher' : 'Display'}</span>
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {filteredItems.length} {filteredItems.length > 1 ? (language === 'fr' ? 'documents disponibles' : 'documents available') : (language === 'fr' ? 'document disponible' : 'document available')}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 rounded-md hover:bg-muted text-foreground transition-colors cursor-pointer"
                    >
                        {language === 'fr' ? 'Fermer' : 'Close'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

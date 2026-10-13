import { useState, useEffect, useMemo, Fragment, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, Search, Plus, Trash2, LayoutGrid, List as ListIcon, X, Pencil, Check, BookOpen, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { mindmapQueries, courseQueries } from '@/lib/api/queries';
import { useLanguage } from '@/components/language-provider';
import { useProfileStore } from '@/store/profileStore';
import { MindMapViewer } from '@/components/MindMapViewer';
import { GenerateMindMapModal } from '@/components/GenerateMindMapModal';
import { MindMapThumbnail } from '@/components/mindmap/MindMapThumbnail';
import { QuizConfirmDialog } from '@/components/quiz/QuizConfirmDialog';
import { parseMindmap, countDescendants } from '@/lib/mindmap/mindmapSource';
import { cn } from '@/lib/utils';
import { Dialog, Transition } from '@headlessui/react';

type SortMode = 'recent' | 'name';
type ViewMode = 'grid' | 'list';

const VIEW_STORAGE_KEY = 'mindmaps-view';

const readView = (): ViewMode => {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
};

export function MindMapsPage() {
    const { t, language } = useLanguage();
    const dateLocale = language === 'fr' ? fr : enUS;
    const navigate = useNavigate();
    const { activeProfile } = useProfileStore();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const targetId = searchParams.get('id');

    const [viewMode, setViewMode] = useState<ViewMode>(readView);
    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedMindMap, setSelectedMindMap] = useState<any>(null);
    const [pendingDelete, setPendingDelete] = useState<any>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState('');

    const { data: mindMaps, isLoading, isError, refetch } = useQuery({
        queryKey: ['mindmaps'],
        queryFn: () => mindmapQueries.getAll(),
        enabled: !!activeProfile
    });

    // Same key/shape as the sidebar's course list (shared cache)
    const { data: coursesData } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseQueries.getAll(1, 1000),
        enabled: !!activeProfile
    });
    const courseById = useMemo(() => {
        const map = new Map<string, any>();
        (coursesData?.courses || []).forEach((course: any) => map.set(course.id, course));
        return map;
    }, [coursesData]);

    // Structure stats per map (main branches / ideas), computed once per content
    const statsById = useMemo(() => {
        const map = new Map<string, { branches: number; ideas: number }>();
        (mindMaps || []).forEach((mm: any) => {
            const tree = parseMindmap(mm.content);
            map.set(mm.id, { branches: tree?.children.length || 0, ideas: countDescendants(tree) });
        });
        return map;
    }, [mindMaps]);

    useEffect(() => {
        if (targetId && mindMaps?.length) {
            const found = mindMaps.find((m: any) => m.id === targetId);
            if (found) setSelectedMindMap(found);
        }
    }, [targetId, mindMaps]);

    // Keep the open map in sync after a rename/refetch
    useEffect(() => {
        if (!selectedMindMap || !mindMaps) return;
        const fresh = mindMaps.find((m: any) => m.id === selectedMindMap.id);
        if (fresh && fresh !== selectedMindMap) setSelectedMindMap(fresh);
    }, [mindMaps]); // eslint-disable-line react-hooks/exhaustive-deps

    const changeView = (mode: ViewMode) => {
        setViewMode(mode);
        try { localStorage.setItem(VIEW_STORAGE_KEY, mode); } catch { /* storage unavailable */ }
    };

    // Closing the viewer also drops ?id= from the URL, otherwise any refetch reopened it
    const closeMindMap = () => {
        setSelectedMindMap(null);
        setIsRenaming(false);
        if (targetId) {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.delete('id');
                return next;
            }, { replace: true });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: mindmapQueries.delete,
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: ['mindmaps'] });
            if (selectedMindMap?.id === id) closeMindMap();
            toast.success(t('mindmap.deleted'));
        },
        onError: () => toast.error(t('mindmap.deleteError'))
    });

    const renameMutation = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => mindmapQueries.update(id, { name }),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['mindmaps'] });
            setSelectedMindMap((current: any) => current && current.id === updated?.id ? { ...current, ...updated } : current);
            setIsRenaming(false);
        },
        onError: () => toast.error(t('mindmap.renameError'))
    });

    const startRename = () => {
        setNameDraft(selectedMindMap?.name || '');
        setIsRenaming(true);
    };

    const submitRename = () => {
        const name = nameDraft.trim();
        if (!name || !selectedMindMap || name === selectedMindMap.name) {
            setIsRenaming(false);
            return;
        }
        renameMutation.mutate({ id: selectedMindMap.id, name });
    };

    const coursesWithMaps = useMemo(() => {
        const ids = new Set((mindMaps || []).map((mm: any) => mm.courseId).filter(Boolean));
        return [...ids].map(id => courseById.get(id as string)).filter(Boolean);
    }, [mindMaps, courseById]);

    const visibleMindMaps = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const list = (mindMaps || []).filter((mm: any) => {
            if (courseFilter === 'none' && mm.courseId) return false;
            if (courseFilter !== 'all' && courseFilter !== 'none' && mm.courseId !== courseFilter) return false;
            return !query || mm.name.toLowerCase().includes(query);
        });
        return [...list].sort((a: any, b: any) => sortMode === 'name'
            ? a.name.localeCompare(b.name, language)
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [mindMaps, searchQuery, courseFilter, sortMode, language]);

    const hasFilters = !!searchQuery.trim() || courseFilter !== 'all';

    const openOnKey = (event: KeyboardEvent, mm: any) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelectedMindMap(mm);
        }
    };

    const renderMeta = (mm: any) => {
        const stats = statsById.get(mm.id);
        return (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(mm.createdAt), { addSuffix: true, locale: dateLocale })}</span>
                {stats && stats.branches > 0 && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span>{t('mindmap.stats', { branches: stats.branches, ideas: stats.ideas })}</span>
                    </>
                )}
            </div>
        );
    };

    const renderCourseBadge = (mm: any) => {
        const course = mm.courseId ? courseById.get(mm.courseId) : null;
        if (!course) return null;
        return (
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{course.title}</span>
            </span>
        );
    };

    const deleteButton = (mm: any) => (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPendingDelete(mm); }}
            className="rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
            title={t('common.delete')}
            aria-label={`${t('common.delete')} — ${mm.name}`}
        >
            <Trash2 className="h-4 w-4" />
        </button>
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="flex items-center gap-3 text-3xl font-bold">
                        <BrainCircuit className="h-8 w-8 text-purple-500" aria-hidden="true" />
                        {t('mindmap.title')}
                    </h1>
                    <p className="mt-1 text-muted-foreground">{t('mindmap.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground shadow-md transition-all hover:opacity-90"
                >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    {t('mindmap.new')}
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        placeholder={t('mindmap.search')}
                        aria-label={t('mindmap.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                    <select
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                        aria-label={t('mindmap.filter.course')}
                        className="min-w-0 max-w-[14rem] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">{t('mindmap.filter.allCourses')}</option>
                        {coursesWithMaps.map((course: any) => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                        <option value="none">{t('mindmap.filter.noCourse')}</option>
                    </select>
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        aria-label={t('mindmap.sort.label')}
                        className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="recent">{t('mindmap.sort.recent')}</option>
                        <option value="name">{t('mindmap.sort.name')}</option>
                    </select>
                    <div className="flex rounded-lg border bg-muted/50 p-1" role="group" aria-label={t('mindmap.viewMode')}>
                        <button
                            type="button"
                            onClick={() => changeView('grid')}
                            aria-pressed={viewMode === 'grid'}
                            aria-label={t('view.grid')}
                            className={cn('rounded-md p-2 transition-all', viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => changeView('list')}
                            aria-pressed={viewMode === 'list'}
                            aria-label={t('view.list')}
                            className={cn('rounded-md p-2 transition-all', viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="overflow-hidden rounded-xl border bg-card">
                            <div className="aspect-video animate-pulse bg-muted" />
                            <div className="space-y-2 p-4">
                                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-2xl border border-dashed py-16 text-center">
                    <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" aria-hidden="true" />
                    <p className="font-medium">{t('mindmap.loadError')}</p>
                    <button onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {t('common.retry')}
                    </button>
                </div>
            ) : visibleMindMaps.length === 0 && hasFilters && (mindMaps?.length || 0) > 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Search className="mx-auto mb-3 h-10 w-10 opacity-50" aria-hidden="true" />
                    <p className="font-medium text-foreground">{t('mindmap.search.noResults', { query: searchQuery.trim() || '…' })}</p>
                    <button onClick={() => { setSearchQuery(''); setCourseFilter('all'); }} className="mt-3 text-sm text-primary hover:underline">
                        {t('mindmap.search.clear')}
                    </button>
                </div>
            ) : visibleMindMaps.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/10 py-20 text-center">
                    <BrainCircuit className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" aria-hidden="true" />
                    <h3 className="text-lg font-medium">{t('mindmap.empty.title')}</h3>
                    <p className="mx-auto mb-6 max-w-md text-muted-foreground">{t('mindmap.empty.desc')}</p>
                    <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('mindmap.empty.action')}
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {visibleMindMaps.map((mm: any) => (
                        <div
                            key={mm.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedMindMap(mm)}
                            onKeyDown={(e) => openOnKey(e, mm)}
                            aria-label={`${t('mindmap.open')} — ${mm.name}`}
                            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <MindMapThumbnail content={mm.content} className="aspect-video border-b" />
                            <div className="flex items-start justify-between gap-2 p-4">
                                <div className="min-w-0 space-y-1.5">
                                    <h3 className="truncate font-semibold transition-colors group-hover:text-primary">{mm.name}</h3>
                                    {renderCourseBadge(mm)}
                                    {renderMeta(mm)}
                                </div>
                                {deleteButton(mm)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleMindMaps.map((mm: any) => (
                        <div
                            key={mm.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedMindMap(mm)}
                            onKeyDown={(e) => openOnKey(e, mm)}
                            aria-label={`${t('mindmap.open')} — ${mm.name}`}
                            className="group flex cursor-pointer items-center gap-4 rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <MindMapThumbnail content={mm.content} className="aspect-video w-28 shrink-0 rounded-lg border sm:w-40" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <h3 className="truncate font-semibold transition-colors group-hover:text-primary">{mm.name}</h3>
                                {renderCourseBadge(mm)}
                                {renderMeta(mm)}
                            </div>
                            {deleteButton(mm)}
                        </div>
                    ))}
                </div>
            )}

            <GenerateMindMapModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onSuccess={(mindMap) => setSelectedMindMap(mindMap)}
            />

            <QuizConfirmDialog
                open={!!pendingDelete}
                title={t('mindmap.delete.confirmTitle')}
                description={pendingDelete ? t('mindmap.delete.confirmDesc', { name: pendingDelete.name }) : undefined}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                destructive
                onConfirm={() => { deleteMutation.mutate(pendingDelete.id); setPendingDelete(null); }}
                onCancel={() => setPendingDelete(null)}
            />

            {/* Viewer */}
            <Transition appear show={!!selectedMindMap} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeMindMap}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center sm:p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="flex h-dvh w-full max-w-7xl flex-col overflow-hidden bg-background shadow-2xl sm:h-[90vh] sm:rounded-2xl sm:border">
                                    {selectedMindMap && (
                                        <>
                                            <div className="flex items-start justify-between gap-3 border-b bg-muted/20 p-3 sm:p-4">
                                                <div className="min-w-0 flex-1">
                                                    {isRenaming ? (
                                                        <form
                                                            onSubmit={(e) => { e.preventDefault(); submitRename(); }}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <input
                                                                autoFocus
                                                                value={nameDraft}
                                                                onChange={(e) => setNameDraft(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setIsRenaming(false); } }}
                                                                aria-label={t('mindmap.rename')}
                                                                className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                                                            />
                                                            <button type="submit" className="rounded-md p-2 text-primary hover:bg-primary/10" aria-label={t('common.save')} disabled={renameMutation.isPending}>
                                                                <Check className="h-5 w-5" />
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <Dialog.Title as="h3" className="truncate text-lg font-bold sm:text-xl">
                                                                {selectedMindMap.name}
                                                            </Dialog.Title>
                                                            <button onClick={startRename} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={t('mindmap.rename')} aria-label={t('mindmap.rename')}>
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                                                        <span>{t('mindmap.createdOn', { date: format(new Date(selectedMindMap.createdAt), 'PPP', { locale: dateLocale }) })}</span>
                                                        {selectedMindMap.courseId && courseById.get(selectedMindMap.courseId) && (
                                                            <button
                                                                onClick={() => { closeMindMap(); navigate(`/edu/course/${selectedMindMap.courseId}`); }}
                                                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                                            >
                                                                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                                                {courseById.get(selectedMindMap.courseId).title}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        // Close the viewer first: the confirmation would otherwise sit outside this Dialog,
                                                        // and Headless UI treats a click on it as an "outside click"
                                                        onClick={() => { const target = selectedMindMap; closeMindMap(); setPendingDelete(target); }}
                                                        className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title={t('common.delete')} aria-label={t('common.delete')}>
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={closeMindMap} className="rounded-full p-2 hover:bg-muted" aria-label={t('common.close')}>
                                                        <X className="h-6 w-6" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="min-h-0 flex-1 p-2 sm:p-4">
                                                <MindMapViewer content={selectedMindMap.content} title={selectedMindMap.name} className="h-full" />
                                            </div>
                                        </>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

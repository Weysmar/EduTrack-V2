
import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Sparkles, FileText, Check, ChevronsUpDown, Loader2, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { itemQueries } from '@/lib/api/queries';
import { apiClient } from '@/lib/api/client';
import { useAIText } from '@/components/ai/useAIText';
import { GenerationProgress } from '@/components/ai/GenerationProgress';
import { AIQuotaLine } from '@/components/ai/AIQuotaLine';
import { AIRequestError, getAIErrorMessage, isAbortError } from '@/lib/ai/errors';
import { AI_REQUEST_TIMEOUT_MS } from '@/lib/ai/constants';
import { ModelSelector } from '@/components/ModelSelector';
import { useAIProvider } from '@/hooks/useAIProvider';
import { useProfileStore } from '@/store/profileStore';

interface GenerateMindMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string; // Optional: prepopulate notes from this course
    initialSelectedNotes?: any[];
    initialSelectedFile?: any;
    onSuccess?: (mindMap: any) => void;
}

export function GenerateMindMapModal({ isOpen, onClose, courseId, initialSelectedNotes = [], initialSelectedFile, onSuccess }: GenerateMindMapModalProps) {
    const { t } = useAIText();
    const queryClient = useQueryClient();
    const { getApiKey } = useProfileStore();

    const geminiKey = getApiKey('google_gemini_summaries') || getApiKey('google_gemini_exercises');
    const perplexityKey = getApiKey('perplexity_summaries') || getApiKey('perplexity_exercises');
    const ai = useAIProvider({ geminiKey, perplexityKey });

    // State
    const [selectedNotes, setSelectedNotes] = useState<any[]>(initialSelectedNotes);
    const [selectedFiles, setSelectedFiles] = useState<any[]>(initialSelectedFile ? [initialSelectedFile] : []);
    const [query, setQuery] = useState('');
    const [fileQuery, setFileQuery] = useState('');
    const [prompt, setPrompt] = useState(''); // Optional custom instructions
    const [name, setName] = useState('');
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Annule la requête si le modal est démonté pendant la génération
    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        if (isOpen) {
            ai.reset();
            if (initialSelectedNotes.length) setSelectedNotes(initialSelectedNotes);
            if (initialSelectedFile) setSelectedFiles([initialSelectedFile]);
        }
    }, [isOpen, initialSelectedNotes, initialSelectedFile, geminiKey, perplexityKey]);


    // Fetch available notes
    const { data: itemsData } = useQuery({
        queryKey: ['items', 'all'],
        queryFn: () => itemQueries.getAll(1, 1000), // Get a large batch for selection
        staleTime: 5 * 60 * 1000
    });

    const allItems = itemsData?.items || [];

    const notes = allItems?.filter((item: any) => item.type === 'note') || [];
    const files = allItems?.filter((item: any) => item.type === 'resource') || [];

    // Filter notes for Combobox
    const filteredNotes =
        query === ''
            ? notes
            : notes.filter((note: any) =>
                note.title.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    // Filter files for Combobox
    const filteredFiles =
        fileQuery === ''
            ? files
            : files.filter((file: any) =>
                (file.title || file.fileName || '').toLowerCase().replace(/\s+/g, '').includes(fileQuery.toLowerCase().replace(/\s+/g, ''))
            );

    // Mutation for generation
    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!ai.hasKeyForProvider) {
                throw new AIRequestError(t('ai.error.missingKey', { provider: ai.provider === 'google' ? 'Google Gemini' : 'Perplexity' }), 'missing_key');
            }
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setStartedAt(Date.now());
            try {
                // Appel direct (plutôt que mindmapQueries.generate) pour pouvoir annuler la requête
                const { data } = await apiClient.post('/mindmaps/generate', {
                    noteIds: selectedNotes.map(n => n.id),
                    fileItemIds: selectedFiles.map(f => f.id),
                    name: name || `Mind Map ${new Date().toLocaleDateString()}`,
                    model: ai.model,
                    provider: ai.provider,
                    courseId // Pass courseId to link the mind map
                }, { timeout: AI_REQUEST_TIMEOUT_MS, signal: controller.signal });
                return data;
            } finally {
                if (abortRef.current === controller) abortRef.current = null;
                setStartedAt(null);
            }
        },
        onSuccess: (data) => {
            toast.success(t('mindmap.gen.success'));
            queryClient.invalidateQueries({ queryKey: ['mindmaps'] });
            if (onSuccess) onSuccess(data);
            handleClose();
        },
        onError: (error: unknown) => {
            if (isAbortError(error)) {
                toast.info(t('ai.cancelled'));
                return;
            }
            toast.error(t('mindmap.gen.error'), { description: getAIErrorMessage(error, { provider: ai.provider }) });
        }
    });

    const isGenerating = generateMutation.isPending;

    const handleClose = () => {
        setSelectedNotes([]);
        setSelectedFiles([]);
        setName('');
        setQuery('');
        setFileQuery('');
        onClose();
    };

    /** Échap / clic extérieur : ignoré pendant la génération (utiliser "Annuler") */
    const handleDialogClose = () => {
        if (isGenerating) return;
        handleClose();
    };

    /** Bouton Annuler : interrompt la génération en cours, sinon ferme le modal */
    const handleCancel = () => {
        if (isGenerating) {
            abortRef.current?.abort();
            return;
        }
        handleClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleDialogClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-border">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 flex items-center gap-2">
                                        <BrainCircuit className="h-5 w-5 text-purple-500" />
                                        {t('mindmap.gen.title')}
                                    </Dialog.Title>
                                    <button onClick={handleCancel} aria-label={t('action.close')} className="text-muted-foreground hover:text-foreground p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Name Input */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('mindmap.gen.name')}</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('mindmap.gen.name.placeholder')}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    {/* Pre-selected Files from View */}
                                    {selectedFiles.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t('mindmap.gen.doc.selected')}</label>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedFiles.map((file) => (
                                                    <span key={file.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                        <FileText className="h-4 w-4" />
                                                        {file.fileName || file.title || "Document"}
                                                        <button
                                                            onClick={() => setSelectedFiles(selectedFiles.filter(f => f.id !== file.id))}
                                                            className="ml-1 hover:text-destructive"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Note Selection */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('mindmap.gen.notes.label')}</label>
                                        <Combobox value={selectedNotes} onChange={setSelectedNotes} multiple>
                                            <div className="relative mt-1">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-background text-left border focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm">
                                                    <Combobox.Input
                                                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 bg-transparent focus:ring-0 text-foreground"
                                                        onChange={(event) => setQuery(event.target.value)}
                                                        placeholder={t('mindmap.gen.notes.placeholder')}
                                                    />
                                                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronsUpDown
                                                            className="h-5 w-5 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                    </Combobox.Button>
                                                </div>
                                                <Transition
                                                    as={Fragment}
                                                    leave="transition ease-in duration-100"
                                                    leaveFrom="opacity-100"
                                                    leaveTo="opacity-0"
                                                    afterLeave={() => setQuery('')}
                                                >
                                                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                                                        {filteredNotes.length === 0 && query !== '' ? (
                                                            <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                                {t('search.noResults')}
                                                            </div>
                                                        ) : (
                                                            filteredNotes.map((note: any) => (
                                                                <Combobox.Option
                                                                    key={note.id}
                                                                    className={({ active }) =>
                                                                        `relative cursor-default select-none py-3 pl-10 pr-4 ${active ? 'bg-primary/20 text-primary' : 'text-foreground'
                                                                        }`
                                                                    }
                                                                    value={note}
                                                                >
                                                                    {({ selected, active }) => (
                                                                        <>
                                                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                                {note.title}
                                                                            </span>
                                                                            {selected ? (
                                                                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-primary' : 'text-primary'}`}>
                                                                                    <Check className="h-5 w-5" aria-hidden="true" />
                                                                                </span>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))
                                                        )}
                                                    </Combobox.Options>
                                                </Transition>
                                            </div>
                                        </Combobox>

                                        {/* Selected Note Badges */}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedNotes.map((note) => (
                                                <span key={note.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    <FileText className="h-3 w-3" />
                                                    {note.title}
                                                    <button
                                                        onClick={() => setSelectedNotes(selectedNotes.filter(n => n.id !== note.id))}
                                                        className="ml-1 hover:text-destructive p-1 min-h-[28px] min-w-[28px] flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* File Selection */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('mindmap.gen.file.label')}</label>
                                        <Combobox value={selectedFiles} onChange={(files) => {
                                            // Ensure we don't duplicate files if they were already pre-selected
                                            // The Combobox onChange sends the new array of selected items. 
                                            // But since we might have mixed pre-selected files that are not in the filteredFiles list (if pagination/search existed, but here we have allItems), it should be fine.
                                            // Actually, initialSelectedFile might be in allItems.
                                            setSelectedFiles(files);
                                        }} multiple>
                                            <div className="relative mt-1">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-background text-left border focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm">
                                                    <Combobox.Input
                                                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 bg-transparent focus:ring-0 text-foreground"
                                                        onChange={(event) => setFileQuery(event.target.value)}
                                                        placeholder={t('mindmap.gen.file.placeholder')}
                                                    />
                                                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronsUpDown
                                                            className="h-5 w-5 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                    </Combobox.Button>
                                                </div>
                                                <Transition
                                                    as={Fragment}
                                                    leave="transition ease-in duration-100"
                                                    leaveFrom="opacity-100"
                                                    leaveTo="opacity-0"
                                                    afterLeave={() => setFileQuery('')}
                                                >
                                                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-popover py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                                                        {filteredFiles.length === 0 && fileQuery !== '' ? (
                                                            <div className="relative cursor-default select-none py-2 px-4 text-muted-foreground">
                                                                {t('search.noResults')}
                                                            </div>
                                                        ) : (
                                                            filteredFiles.map((file: any) => (
                                                                <Combobox.Option
                                                                    key={file.id}
                                                                    className={({ active }) =>
                                                                        `relative cursor-default select-none py-3 pl-10 pr-4 ${active ? 'bg-primary/20 text-primary' : 'text-foreground'
                                                                        }`
                                                                    }
                                                                    value={file}
                                                                >
                                                                    {({ selected, active }) => (
                                                                        <>
                                                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                                {file.title || file.fileName}
                                                                            </span>
                                                                            {selected ? (
                                                                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-primary' : 'text-primary'}`}>
                                                                                    <Check className="h-5 w-5" aria-hidden="true" />
                                                                                </span>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))
                                                        )}
                                                    </Combobox.Options>
                                                </Transition>
                                            </div>
                                        </Combobox>

                                        {/* Selected File Badges */}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedFiles.map((file) => (
                                                <span key={file.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                    <FileText className="h-3 w-3" />
                                                    {file.title || file.fileName}
                                                    <button
                                                        onClick={() => setSelectedFiles(selectedFiles.filter(f => f.id !== file.id))}
                                                        className="ml-1 hover:text-destructive p-1 min-h-[28px] min-w-[28px] flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Model Selection */}
                                    <ModelSelector
                                        provider={ai.provider}
                                        model={ai.model}
                                        setProvider={ai.setProvider}
                                        setModel={ai.setModel}
                                        hasKeyForProvider={ai.hasKeyForProvider}
                                        geminiKey={geminiKey}
                                        perplexityKey={perplexityKey}
                                        onClose={handleClose}
                                    />

                                    <GenerationProgress startedAt={startedAt} showKeepOpenHint />

                                    <div className="flex flex-wrap items-center justify-end gap-3 mt-6">
                                        <AIQuotaLine className="mr-auto" />
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 min-h-[40px] text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                        >
                                            {isGenerating ? t('ai.action.cancelGeneration') : t('mindmap.gen.cancel')}
                                        </button>
                                        <button
                                            onClick={() => generateMutation.mutate()}
                                            disabled={generateMutation.isPending || !ai.hasKeyForProvider || (selectedNotes.length === 0 && selectedFiles.length === 0)}
                                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {generateMutation.isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    {t('mindmap.gen.generating')}
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    {t('mindmap.gen.submit')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

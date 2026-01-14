
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Sparkles, FileText, Check, ChevronsUpDown, Loader2, Plus, Upload, BrainCircuit } from 'lucide-react';
import { toast } from 'sonner';
import { itemQueries } from '@/lib/api/queries';
import { mindmapQueries } from '@/lib/api/queries/mindmapQueries';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface GenerateMindMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId?: string; // Optional: prepopulate notes from this course
    initialSelectedNotes?: any[];
    initialSelectedFile?: any; // Add initial file item
}

export function GenerateMindMapModal({ isOpen, onClose, courseId, initialSelectedNotes = [], initialSelectedFile }: GenerateMindMapModalProps) {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    // State
    const [selectedNotes, setSelectedNotes] = useState<any[]>(initialSelectedNotes);
    const [selectedFiles, setSelectedFiles] = useState<any[]>(initialSelectedFile ? [initialSelectedFile] : []);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [query, setQuery] = useState('');
    const [prompt, setPrompt] = useState(''); // Optional custom instructions
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialSelectedNotes.length) setSelectedNotes(initialSelectedNotes);
            if (initialSelectedFile) setSelectedFiles([initialSelectedFile]);
        }
    }, [isOpen, initialSelectedNotes, initialSelectedFile]);


    // Fetch available notes
    const { data: allItems } = useQuery({
        queryKey: ['items', 'all'],
        queryFn: itemQueries.getAll,
        staleTime: 5 * 60 * 1000
    });

    const notes = allItems?.filter((item: any) => item.type === 'note') || [];

    // Filter notes for Combobox
    const filteredNotes =
        query === ''
            ? notes
            : notes.filter((note: any) =>
                note.title.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    // Mutation for generation
    const generateMutation = useMutation({
        mutationFn: async () => {
            return mindmapQueries.generate({
                noteIds: selectedNotes.map(n => n.id),
                fileItemIds: selectedFiles.map(f => f.id),
                name: name || `Mind Map ${new Date().toLocaleDateString()}`
            });
        },
        onSuccess: () => {
            toast.success('Mind Map generated successfully!');
            queryClient.invalidateQueries({ queryKey: ['mindmaps'] });
            handleClose();
        },
        onError: (error: any) => {
            toast.error('Failed to generate mind map: ' + (error.response?.data?.message || error.message));
        }
    });

    const handleClose = () => {
        setSelectedNotes([]);
        setSelectedFiles([]);
        setUploadedFiles([]);
        setName('');
        setQuery('');
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-card p-6 text-left align-middle shadow-xl transition-all border border-border">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 flex items-center gap-2">
                                        <BrainCircuit className="h-5 w-5 text-purple-500" />
                                        Generate AI Mind Map
                                    </Dialog.Title>
                                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Name Input */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Mind Map Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., History of Rome Overview"
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    {/* Pre-selected Files from View */}
                                    {selectedFiles.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Selected Document</label>
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
                                        <label className="block text-sm font-medium mb-1">Select Notes to Analyze</label>
                                        <Combobox value={selectedNotes} onChange={setSelectedNotes} multiple>
                                            <div className="relative mt-1">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-background text-left border focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm">
                                                    <Combobox.Input
                                                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 bg-transparent focus:ring-0 text-foreground"
                                                        onChange={(event) => setQuery(event.target.value)}
                                                        placeholder="Search your notes..."
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
                                                                Nothing found.
                                                            </div>
                                                        ) : (
                                                            filteredNotes.map((note: any) => (
                                                                <Combobox.Option
                                                                    key={note.id}
                                                                    className={({ active }) =>
                                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary/20 text-primary' : 'text-foreground'
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

                                        {/* Selected Badges */}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedNotes.map((note) => (
                                                <span key={note.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    <FileText className="h-3 w-3" />
                                                    {note.title}
                                                    <button
                                                        onClick={() => setSelectedNotes(selectedNotes.filter(n => n.id !== note.id))}
                                                        className="ml-1 hover:text-destructive"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* File Upload (Placeholder for now) */}
                                    <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/20">
                                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground mb-1">Upload PDF, DOCX, PPTX files (Coming Soon)</p>
                                        <button className="text-xs text-primary font-medium hover:underline" disabled>
                                            Browse files
                                        </button>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={handleClose}
                                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => generateMutation.mutate()}
                                            disabled={generateMutation.isPending || (selectedNotes.length === 0 && selectedFiles.length === 0 && uploadedFiles.length === 0)}
                                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {generateMutation.isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-4 w-4" />
                                                    Generate Mind Map
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

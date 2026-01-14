
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, Search, Plus, Trash2, Calendar, FileText, LayoutGrid, List as ListIcon, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { mindmapQueries } from '@/lib/api/queries/mindmapQueries';
import { useLanguage } from '@/components/language-provider';
import { MindMapViewer } from '@/components/MindMapViewer';
import { GenerateMindMapModal } from '@/components/GenerateMindMapModal';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export function MindMapsPage() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedMindMap, setSelectedMindMap] = useState<any>(null);

    const { data: mindMaps, isLoading } = useQuery({
        queryKey: ['mindmaps'],
        queryFn: mindmapQueries.getAll
    });

    const deleteMutation = useMutation({
        mutationFn: mindmapQueries.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mindmaps'] });
            setSelectedMindMap(null); // Close detail if open
        }
    });

    const filteredMindMaps = mindMaps?.filter((mm: any) =>
        mm.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this mind map?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BrainCircuit className="h-8 w-8 text-purple-500" />
                        Mind Maps
                    </h1>
                    <p className="text-muted-foreground mt-1">Visualize your knowledge with AI-generated diagrams.</p>
                </div>
                <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all shadow-md flex items-center gap-2 font-medium"
                >
                    <Plus className="h-5 w-5" />
                    New Mind Map
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search mind maps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                </div>
                <div className="flex bg-muted/50 p-1 rounded-lg border">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <ListIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredMindMaps.length === 0 ? (
                <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed">
                    <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No mind maps yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create your first mind map from your notes to better visualize concepts and connections.</p>
                    <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Now
                    </button>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {filteredMindMaps.map((mm: any) => (
                        <div
                            key={mm.id}
                            onClick={() => setSelectedMindMap(mm)}
                            className={`group bg-card border rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col'
                                }`}
                        >
                            {/* Preview Stub */}
                            <div className={`${viewMode === 'list' ? 'w-24 h-24 rounded-lg' : 'pt-[56.25%]'} bg-muted/30 relative border-b border-border/50`}>
                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                    <pre className="text-[6px] opacity-30 overflow-hidden leading-tight font-mono select-none pointer-events-none w-full h-full text-center">
                                        {mm.content.substring(0, 300)}
                                    </pre>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="px-2 py-1 bg-background/80 backdrop-blur text-xs rounded-md shadow-sm border font-medium">
                                        Open
                                    </span>
                                </div>
                            </div>

                            <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex justify-between items-center p-0' : ''}`}>
                                <div>
                                    <h3 className="font-semibold truncate mb-1 text-lg group-hover:text-primary transition-colors">{mm.name}</h3>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(mm.createdAt), 'PP')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {(mm.sources?.noteIds?.length || 0) + (mm.sources?.fileNames?.length || 0)} sources
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, mm.id)}
                                    className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <GenerateMindMapModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
            />

            {/* Detail Modal */}
            <Transition appear show={!!selectedMindMap} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setSelectedMindMap(null)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-background p-1 shadow-2xl transition-all border border-border">
                                    {selectedMindMap && (
                                        <div className="flex flex-col h-[85vh]">
                                            <div className="flex justify-between items-center p-4 border-b bg-muted/20">
                                                <div>
                                                    <Dialog.Title as="h3" className="text-xl font-bold">
                                                        {selectedMindMap.name}
                                                    </Dialog.Title>
                                                    <p className="text-sm text-muted-foreground">
                                                        Generated on {format(new Date(selectedMindMap.createdAt), 'PPP')}
                                                    </p>
                                                </div>
                                                <button onClick={() => setSelectedMindMap(null)} className="p-2 hover:bg-muted rounded-full">
                                                    <X className="h-6 w-6" />
                                                </button>
                                            </div>
                                            <div className="flex-1 overflow-auto bg-muted/5 p-4">
                                                <MindMapViewer content={selectedMindMap.content} className="h-full border-none shadow-none" />
                                            </div>
                                        </div>
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

import { useState } from 'react';
import { X } from 'lucide-react';
import { CorkBoardCanvas } from './CorkBoardCanvas';
import { useLanguage } from '@/components/language-provider';
import { useKnowledgeMapData } from '@/hooks/useKnowledgeMapData';
import { OrphanSection } from './OrphanSection';
import { SearchBar } from './SearchBar';

interface KnowledgeMapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KnowledgeMapModal({ isOpen, onClose }: KnowledgeMapModalProps) {
    const { t } = useLanguage();
    const { orphanCourses } = useKnowledgeMapData();
    const [searchQuery, setSearchQuery] = useState('');
    const [showTopics, setShowTopics] = useState(true);
    const [showCourses, setShowCourses] = useState(true);
    const [showDocuments, setShowDocuments] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[95vw] h-[90vh] bg-background rounded-lg shadow-2xl relative flex flex-col overflow-hidden border-4 border-[#8B5E3C]">
                {/* Header */}
                <div className="h-14 bg-[#5D4037] text-[#EFEBE9] px-4 flex items-center justify-between shadow-md z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📌</span>
                            <h2 className="text-lg font-bold font-serif tracking-wide hidden sm:block">
                                {t('board.mapTitle') || 'Cork Board Knowledge Map'}
                            </h2>
                        </div>

                        {/* Search Bar in Header */}
                        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t('board.search.placeholder') || "Search..."} />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#8D6E63] rounded-full transition-colors text-white"
                            aria-label="Close Map"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden h-full">
                    <CorkBoardCanvas
                        searchQuery={searchQuery}
                        showTopics={showTopics}
                        showCourses={showCourses}
                        showDocuments={showDocuments}
                        onToggleTopics={setShowTopics}
                        onToggleCourses={setShowCourses}
                        onToggleDocuments={setShowDocuments}
                        onClose={onClose}
                    />
                </div>

                {/* Footer (Orphans) */}
                <div className="h-32 bg-[#3E2723] border-t-4 border-[#2D1B17] text-[#D7CCC8] relative flex flex-col shrink-0">
                    <div className="absolute -top-3 left-4 bg-[#5D4037] px-3 py-1 text-xs font-bold rounded-t-md shadow-sm border-t border-l border-r border-[#795548] z-20">
                        📭 {t('board.orphans') || 'Orphan Courses'}
                    </div>
                    <OrphanSection orphans={orphanCourses} />
                </div>
            </div>
        </div>
    );
}

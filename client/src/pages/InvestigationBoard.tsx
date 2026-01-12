import { useState } from 'react';
import { CorkBoardCanvas } from '@/components/knowledge-map/CorkBoardCanvas';
import { useLanguage } from '@/components/language-provider';
import { useKnowledgeMapData } from '@/hooks/useKnowledgeMapData';
import { OrphanSection } from '@/components/knowledge-map/OrphanSection';
import { SearchBar } from '@/components/knowledge-map/SearchBar';

export function InvestigationBoard() {
    const { t } = useLanguage();
    const { orphanCourses } = useKnowledgeMapData();
    const [searchQuery, setSearchQuery] = useState('');
    const [showTopics, setShowTopics] = useState(true);
    const [showCourses, setShowCourses] = useState(true);
    const [showDocuments, setShowDocuments] = useState(true); // default to true to see everything initially? Or false like before. Let's keep false but check logic.

    // Placeholder onClose for interactions that might require it (though less relevant in full page)
    const handleClose = () => {
        // Maybe navigate back to dashboard or do nothing
    };

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background overflow-hidden border-t border-[#8B5E3C]">
            {/* Header - Adapted for Page View */}
            <div className="h-16 bg-[#5D4037] text-[#EFEBE9] px-6 flex items-center justify-between shadow-md z-10 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📌</span>
                        <div>
                            <h1 className="text-xl font-bold font-serif tracking-wide text-[#EFEBE9]">
                                {t('board.mapTitle') || 'Tableau d\'Enquête'}
                            </h1>
                            <p className="text-xs text-[#EFEBE9]/70 hidden sm:block">
                                {t('board.subtitle') || 'Explorez votre base de connaissances'}
                            </p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="max-w-md w-full">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t('board.search.placeholder') || "Rechercher des indices..."} />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Additional Page Actions could go here */}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden h-full shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
                <CorkBoardCanvas
                    searchQuery={searchQuery}
                    showTopics={showTopics}
                    showCourses={showCourses}
                    showDocuments={showDocuments}
                    onToggleTopics={setShowTopics}
                    onToggleCourses={setShowCourses}
                    onToggleDocuments={setShowDocuments}
                    onClose={handleClose}
                />
            </div>

            {/* Footer (Orphans) */}
            <div className="h-40 bg-[#3E2723] border-t-4 border-[#2D1B17] text-[#D7CCC8] relative flex flex-col shrink-0">
                <div className="absolute -top-3 left-6 bg-[#5D4037] px-4 py-1.5 text-xs font-bold rounded-t-lg shadow-sm border-t border-l border-r border-[#795548] z-20 flex items-center gap-2">
                    <span>📭</span>
                    <span>{t('board.orphans') || 'Dossiers Non Classés'}</span>
                </div>
                <div className="p-4 h-full overflow-hidden">
                    <OrphanSection orphans={orphanCourses} />
                </div>
            </div>
        </div>
    );
}

import { Filter, Layers, BookOpen, Book } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import { Panel } from 'reactflow';

interface FilterPanelProps {
    showTopics: boolean;
    setShowTopics: (v: boolean) => void;
    showCourses: boolean;
    setShowCourses: (v: boolean) => void;
}

export function FilterPanel({ showTopics, setShowTopics, showCourses, setShowCourses }: FilterPanelProps) {
    const { t } = useLanguage();

    return (
        <Panel position="top-left" className="m-4">
            <div className="bg-white/90 backdrop-blur-sm border-2 border-[#8B5E3C] rounded-lg shadow-xl p-2 flex flex-col gap-2 min-w-[150px]">
                <div className="flex items-center gap-2 px-2 py-1 border-b border-[#8B5E3C]/20 text-[#5D4037] font-bold text-xs uppercase tracking-wider">
                    <Filter className="h-3 w-3" />
                    {t('action.filter') || 'Filters'}
                </div>

                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#D7CCC8]/30 rounded cursor-pointer transition-colors group">
                    <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        showTopics ? "bg-[#5D4037] border-[#5D4037]" : "border-[#8D6E63]"
                    )}>
                        {showTopics && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                    </div>
                    <input
                        type="checkbox"
                        checked={showTopics}
                        onChange={(e) => setShowTopics(e.target.checked)}
                        className="hidden"
                    />
                    <Book className="h-4 w-4 text-[#8D6E63] group-hover:text-[#5D4037]" />
                    <span className="text-sm text-[#3E2723] select-none">{t('common.topics') || 'Topics'}</span>
                </label>

                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#D7CCC8]/30 rounded cursor-pointer transition-colors group">
                    <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        showCourses ? "bg-[#5D4037] border-[#5D4037]" : "border-[#8D6E63]"
                    )}>
                        {showCourses && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                    </div>
                    <input
                        type="checkbox"
                        checked={showCourses}
                        onChange={(e) => setShowCourses(e.target.checked)}
                        className="hidden"
                    />
                    <BookOpen className="h-4 w-4 text-[#8D6E63] group-hover:text-[#5D4037]" />
                    <span className="text-sm text-[#3E2723] select-none">{t('common.courses') || 'Courses'}</span>
                </label>
            </div>
        </Panel>
    );
}

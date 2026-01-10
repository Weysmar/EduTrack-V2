import { useLanguage } from '@/components/language-provider';

interface OrphanSectionProps {
    orphans: any[];
}

export function OrphanSection({ orphans }: OrphanSectionProps) {
    const { t } = useLanguage();

    return (
        <div className="flex-1 flex items-center gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-[#5D4037] scrollbar-track-[#3E2723]">
            {orphans.length === 0 ? (
                <div className="text-sm opacity-50 italic mx-auto text-[#D7CCC8]">
                    {t('board.noOrphans') || 'All courses are assigned to a topic.'}
                </div>
            ) : (
                orphans.map(course => (
                    <div
                        key={course.id}
                        className="flex-shrink-0 w-48 h-32 bg-[#FFECB3] border-l-4 border-[#FFC107] shadow-md rounded-sm p-3 flex flex-col cursor-grab hover:scale-105 transition-transform rotate-1 overflow-hidden relative"
                    >
                        {/* Tape effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-white/40 rotate-1 shadow-sm backdrop-blur-[1px]" />

                        <div className="mt-2 text-xs font-bold text-[#FFA000] uppercase tracking-wider mb-1">
                            {t('board.orphans') || 'Orphan'}
                        </div>
                        <h4 className="text-sm font-bold text-[#3E2723] line-clamp-2 leading-tight">
                            {course.title}
                        </h4>
                        <div className="mt-auto text-[10px] text-[#5D4037]/70 font-mono text-right">
                            #{course.id}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

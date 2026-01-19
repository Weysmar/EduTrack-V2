
import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CheckSquare, FileText, Dumbbell, Calendar, Brain, Layers, FileCheck } from 'lucide-react';
import { FilePreview } from '@/components/FilePreview';
import { useLanguage } from '@/components/language-provider';
import { API_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';

interface CourseGridItemProps {
    item: any; // Ideally this should be a proper type
    isSelected: boolean;
    showThumbnails: boolean;
    onToggleSelection: (id: string) => void;
}

export const CourseGridItem = memo(({ item, isSelected, showThumbnails, onToggleSelection }: CourseGridItemProps) => {
    const navigate = useNavigate();
    const { courseId } = useParams();
    const { t } = useLanguage();
    const token = useAuthStore(state => state.token);

    const typeKey = {
        note: 'item.create.type.note',
        exercise: 'item.create.type.exercise',
        resource: 'item.create.type.resource',
        quiz: 'filter.quiz',
        flashcards: 'filter.flashcards',
        mindmap: 'filter.mindmaps',
        summary: 'filter.summaries'
    }[item.type] || item.type;

    return (
        <div
            className={cn(
                "group flex flex-col p-0 bg-card border rounded-xl hover:shadow-lg transition-all cursor-pointer relative overflow-hidden",
                isSelected ? "ring-2 ring-primary ring-inset border-transparent z-10" : "border-border"
            )}
            onClick={(e) => {
                navigate(`/course/${courseId}/item/${item.id}`)
            }}
        >
            {/* Selection Checkbox (Visible on hover or if selected) */}
            <div
                className={cn(
                    "absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity",
                    isSelected && "opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => onToggleSelection(item.id)}
                    className={cn(
                        "w-6 h-6 rounded-md border shadow-sm flex items-center justify-center transition-colors backdrop-blur-sm",
                        isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background/80 border-muted-foreground/30 hover:border-primary"
                    )}
                >
                    {isSelected && <CheckSquare className="h-4 w-4" />}
                </button>
            </div>

            {/* TOP: File Preview / Header Area */}
            <div className="w-full aspect-video bg-muted border-b relative group-hover:opacity-95 transition-opacity">
                {item.type === 'resource' ? (
                    item.thumbnailUrl ? (
                        <div className="w-full h-full relative overflow-hidden">
                            <img
                                src={`${API_URL}/storage/proxy/${item.thumbnailUrl.split('/').pop()}?token=${token}`}
                                alt={item.fileName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                            {/* Overlay for file type if needed, or just let FilePreview handle it if we passed it there. 
                                  Let's check if FilePreview handles arbitrary images. 
                                  FilePreview seems complex. For thumbnail, simple img is best.
                              */}
                        </div>
                    ) : (
                        <FilePreview
                            url={item.storageKey ? `${API_URL}/storage/proxy/${item.storageKey}?token=${token}` : item.fileUrl}
                            fileName={item.fileName}
                            fileType={item.fileType}
                            showThumbnails={showThumbnails}
                        />
                    )
                ) : (
                    <div className={cn(
                        "w-full h-full flex items-center justify-center",
                        item.type === 'note' && "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-500",
                        item.type === 'exercise' && "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-500",
                        item.type === 'quiz' && "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-500",
                        item.type === 'flashcards' && "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500",
                        item.type === 'mindmap' && "bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-500",
                        item.type === 'summary' && "bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-500"
                    )}>
                        {item.type === 'note' && <FileText className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 transition-all" />}
                        {item.type === 'exercise' && <Dumbbell className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 transition-all" />}
                        {item.type === 'quiz' && <CheckSquare className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 transition-all" />}
                        {item.type === 'flashcards' && <Layers className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 transition-all" />}
                        {item.type === 'mindmap' && <Brain className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 transition-all" />}
                        {item.type === 'summary' && <FileCheck className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 transition-all" />}
                    </div>
                )}

                {/* Type Badge Overlay */}
                <div className="absolute bottom-2 left-2 z-10">
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md border border-white/10",
                        item.type === 'resource' && "bg-blue-500/90 text-white",
                        item.type === 'note' && "bg-yellow-500/90 text-white",
                        item.type === 'exercise' && "bg-green-500/90 text-white",
                        item.type === 'quiz' && "bg-purple-500/90 text-white",
                        item.type === 'flashcards' && "bg-orange-500/90 text-white",
                        item.type === 'mindmap' && "bg-pink-500/90 text-white",
                        item.type === 'summary' && "bg-cyan-500/90 text-white"
                    )}>
                        {t(typeKey)}
                    </span>
                </div>

                {/* Hover Preview Overlay */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center z-30 pointer-events-none">
                    <p className="text-white font-bold text-sm mb-2 line-clamp-3">{item.title}</p>
                    {item.fileName && (
                        <p className="text-white/80 text-xs italic mb-1 line-clamp-1">{item.fileName}</p>
                    )}
                    <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-[10px] text-white uppercase tracking-wider font-bold border border-white/30">
                        {t('action.preview') || 'Aperçu'}
                    </div>
                </div>
            </div>

            {/* CONTENT: Text Info */}
            <div className="p-3 sm:p-4 flex flex-col gap-1 sm:gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2" title={item.title}>
                        {item.title}
                    </h3>
                </div>

                <div className="text-[10px] sm:text-xs text-muted-foreground/70 sm:mt-2 flex items-center gap-2 overflow-hidden">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.fileName && (
                        <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline truncate max-w-[150px] italic opacity-80" title={item.fileName}>{item.fileName}</span>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
});

CourseGridItem.displayName = "CourseGridItem";

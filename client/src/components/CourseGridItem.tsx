
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
                "group flex flex-col h-full p-0 bg-card border rounded-xl hover:shadow-lg transition-all cursor-pointer relative overflow-hidden",
                isSelected ? "ring-2 ring-primary ring-inset border-transparent z-10" : "border-border"
            )}
            onClick={(e) => {
                if (item.type === 'quiz') {
                    navigate(`/edu/quiz/study/${item.id}`);
                } else if (item.type === 'flashcards') {
                    navigate(`/edu/flashcards/study/${item.id}`);
                } else if (item.type === 'mindmap') {
                    navigate('/edu/mindmaps');
                } else if (item.type === 'summary' && item.itemId) {
                    navigate(`/edu/course/${courseId}/item/${item.itemId}`);
                } else {
                    navigate(`/edu/course/${courseId}/item/${item.id}`)
                }
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

            {/* TOP: File Preview / Header Area - Strictly uniform 16:9 box */}
            <div className="w-full aspect-video bg-muted/40 border-b relative overflow-hidden flex-shrink-0 group-hover:opacity-95 transition-opacity">
                <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
                    {(item.thumbnailUrl || item.fileName) ? (
                        item.thumbnailUrl ? (
                            <img
                                src={`${API_URL}/storage/proxy/${item.thumbnailUrl.split('/').pop()}?token=${token}`}
                                alt={item.fileName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            <FilePreview
                                url={item.storageKey ? `${API_URL}/storage/proxy/${item.storageKey}?token=${token}` : item.fileUrl}
                                fileName={item.fileName}
                                fileType={item.fileType}
                                showThumbnails={showThumbnails}
                                className="w-full h-full"
                            />
                        )
                    ) : (
                        <div className={cn(
                            "w-full h-full flex flex-col items-center justify-center relative",
                            item.type === 'note' && "bg-yellow-50/70 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-500",
                            item.type === 'exercise' && "bg-green-50/70 dark:bg-green-950/20 text-green-600 dark:text-green-500",
                            item.type === 'quiz' && "bg-purple-50/70 dark:bg-purple-950/20 text-purple-600 dark:text-purple-500",
                            item.type === 'flashcards' && "bg-orange-50/70 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500",
                            item.type === 'summary' && "bg-cyan-50/70 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-500"
                        )}>
                            {item.type === 'note' && <FileText className="h-10 w-10 opacity-70" />}
                            {item.type === 'exercise' && <Dumbbell className="h-10 w-10 opacity-70" />}
                            {item.type === 'quiz' && <CheckSquare className="h-10 w-10 opacity-70" />}
                            {item.type === 'flashcards' && <Layers className="h-10 w-10 opacity-70" />}
                            {item.type === 'summary' && <FileCheck className="h-10 w-10 opacity-70" />}
                            <div className="absolute top-0 right-0 w-8 h-8 bg-black/5 dark:bg-white/5 rounded-bl-xl" />
                        </div>
                    )}
                </div>

                {/* Type Badge Overlay */}
                <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                    <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md border border-white/10",
                        item.type === 'resource' && "bg-blue-500/90 text-white",
                        item.type === 'note' && "bg-yellow-500/90 text-white",
                        item.type === 'exercise' && "bg-green-500/90 text-white",
                        item.type === 'quiz' && "bg-purple-500/90 text-white",
                        item.type === 'flashcards' && "bg-orange-500/90 text-white",
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

            {/* CONTENT: Text Info - Uniform height and bottom-pinned metadata */}
            <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 gap-2">
                <div className="min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5em] flex items-center" title={item.title}>
                        {item.title}
                    </h3>
                </div>

                <div className="text-[10px] sm:text-xs text-muted-foreground/70 flex items-center gap-1.5 overflow-hidden mt-auto pt-1.5 border-t border-border/40">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.fileName ? (
                        <>
                            <span className="opacity-40">•</span>
                            <span className="truncate italic opacity-80" title={item.fileName}>{item.fileName}</span>
                        </>
                    ) : (
                        <>
                            <span className="opacity-40">•</span>
                            <span className="truncate italic opacity-60">{t(typeKey)}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

CourseGridItem.displayName = "CourseGridItem";

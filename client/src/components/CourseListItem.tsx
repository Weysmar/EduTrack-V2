
import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CheckSquare, FileText, Dumbbell, FolderOpen, Calendar, Brain, Layers, FileCheck } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

// Helper to get styling for List View Icons (copied from CourseView / FilePreview)
const getFileIconStyle = (fileName: string | undefined) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';

    if (['pdf'].includes(ext)) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'PDF' };
    if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'WORD' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: 'EXCEL' };
    if (['ppt', 'pptx'].includes(ext)) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', label: 'PPT' };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext)) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', label: ext.toUpperCase() };
    if (['txt', 'md'].includes(ext)) return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-600 dark:text-gray-400', label: ext.toUpperCase() };

    return { bg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', label: null }; // Default
}

const getFileExtensionColor = (fileName: string | undefined) => {
    if (!fileName) return 'bg-muted text-foreground/80'

    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    switch (ext) {
        case 'pdf': return 'bg-red-500/90 text-white'
        case 'docx': case 'doc': return 'bg-blue-500/90 text-white'
        case 'xlsx': case 'xls': case 'csv': return 'bg-green-600/90 text-white'
        case 'pptx': case 'ppt': return 'bg-orange-500/90 text-white'
        case 'zip': case 'rar': case '7z': return 'bg-slate-600/90 text-white'
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp': case 'avif': case 'bmp':
            return 'bg-yellow-500/90 text-white'
        default: return 'bg-muted text-foreground/80 border'
    }
}


interface CourseListItemProps {
    item: any;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
}

export const CourseListItem = memo(({ item, isSelected, onToggleSelection }: CourseListItemProps) => {
    const navigate = useNavigate();
    const { courseId } = useParams();
    const { t } = useLanguage();

    const typeKey = {
        note: 'item.create.type.note',
        exercise: 'item.create.type.exercise',
        resource: 'item.create.type.resource'
    }[item.type] || item.type;

    const fileStyle = item.type === 'resource' ? getFileIconStyle(item.fileName) : null;

    return (
        <div
            onClick={() => navigate(`/course/${courseId}/item/${item.id}`)}
            className={cn(
                "group flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-lg transition-all cursor-pointer",
                isSelected ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md" : "border-border shadow-sm"
            )}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                    onClick={(e) => { e.stopPropagation(); onToggleSelection(item.id) }}
                    className={cn("w-5 h-5 rounded border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground hover:border-primary"
                    )}
                >
                    {isSelected && <CheckSquare className="h-3 w-3" />}
                </div>

                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner relative overflow-hidden",
                    item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
                    item.type === 'exercise' && "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
                    item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
                    item.type === 'exercise' && "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
                    item.type === 'quiz' && "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
                    item.type === 'flashcards' && "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
                    item.type === 'mindmap' && "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
                    item.type === 'summary' && "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
                    item.type === 'resource' && (fileStyle?.bg || "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400")
                )}>
                    {item.type === 'note' && <FileText className="h-6 w-6" />}
                    {item.type === 'exercise' && <Dumbbell className="h-6 w-6" />}
                    {item.type === 'quiz' && <CheckSquare className="h-6 w-6" />}
                    {item.type === 'flashcards' && <Layers className="h-6 w-6" />}
                    {item.type === 'mindmap' && <Brain className="h-6 w-6" />}
                    {item.type === 'summary' && <FileCheck className="h-6 w-6" />}
                    {item.type === 'resource' && (
                        fileStyle?.label ? (
                            <div className="flex flex-col items-center justify-center w-full h-full">
                                <span className={cn("text-[8px] font-bold tracking-widest", fileStyle.text)}>{fileStyle.label.substring(0, 4)}</span>
                                <div className={cn("absolute top-0 right-0 w-3 h-3 bg-black/5 dark:bg-white/5 rounded-bl-md")} />
                            </div>
                        ) : (
                            <FolderOpen className="h-6 w-6" />
                        )
                    )}
                </div>

                <div className="flex flex-col min-w-0 flex-1 px-1">
                    <span className="font-medium truncate text-sm sm:text-base">{item.title}</span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground mt-1">
                        <span className="uppercase tracking-wider font-bold text-primary/80">{t(typeKey)}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.fileName && (
                            <>
                                <span>•</span>
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded font-mono text-[9px] sm:text-[10px] uppercase font-bold tracking-wider shadow-sm border border-white/10",
                                    getFileExtensionColor(item.fileName)
                                )}>
                                    {item.fileName.split('.').pop()}
                                </span>
                                <span className="truncate max-w-[120px] sm:max-w-md opacity-60 italic">{item.fileName}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

CourseListItem.displayName = "CourseListItem";

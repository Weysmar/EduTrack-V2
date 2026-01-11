import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { HierarchyNode } from '@/types/knowledge-map';
import { useKnowledgeMapData } from '@/hooks/useKnowledgeMapData';
import { useLanguage } from '@/components/language-provider';
import { Book, FileText, FolderOpen, Image as ImageIcon, Briefcase } from 'lucide-react';
import { API_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';

const DepthColors = {
    0: 'bg-blue-500 border-blue-700 text-white',
    1: 'bg-red-500 border-red-700 text-white',
    2: 'bg-orange-500 border-orange-700 text-white',
    3: 'bg-purple-500 border-purple-700 text-white',
    4: 'bg-pink-500 border-pink-700 text-white',
    5: 'bg-cyan-500 border-cyan-700 text-white',
    default: 'bg-gray-400 border-gray-600 text-white'
};

const CourseColor = 'bg-yellow-200 border-yellow-400 text-black';

export const PostItNode = memo(({ data }: NodeProps<HierarchyNode>) => {
    const isTopic = data.type === 'topic';
    const isCourse = data.type === 'course';
    const isItem = data.type === 'item';
    const { assignCourseToFolder, uploadFile } = useKnowledgeMapData();
    const { t } = useLanguage();
    const token = useAuthStore(state => state.token);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Determine Color based on Depth or Type
    let colorClass = DepthColors.default;
    if (isTopic) {
        colorClass = DepthColors[data.depth as keyof typeof DepthColors] || DepthColors.default;
    } else {
        colorClass = CourseColor;
    }

    // Determine Image Preview URL
    const isImage = isItem && data.data?.fileType?.startsWith('image/');
    // Handle specific file extensions if fileType is generic
    const isImageFile = isItem && (
        isImage ||
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(data.data?.fileType?.split('/').pop() || '')
    );

    const imageUrl = isImageFile && data.data?.storageKey
        ? `${API_URL}/storage/proxy/${data.data.storageKey}?token=${token}`
        : null;


    const handleDragOver = (e: React.DragEvent) => {
        if (!isTopic && !isCourse) return; // Allow on courses (for files) and topics (for courses)
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'; // 'copy' for files usually
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        // 1. Handle File Upload (Drag file onto Course)
        if (isCourse && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
                try {
                    await uploadFile({ file, courseId: data.id });
                    // Optional: toast success
                } catch (err) {
                    console.error("Failed to upload file", err);
                }
            }
            return;
        }

        // 2. Handle Organize (Drag Course onto Folder)
        if (isTopic) {
            const courseId = e.dataTransfer.getData('application/reactflow/courseId');
            if (courseId) {
                try {
                    await assignCourseToFolder({ courseId, folderId: data.id });
                } catch (err) {
                    console.error("Failed to assign course", err);
                }
            }
        }
    };

    // Preview Timer to prevent flickering
    const handleMouseEnter = () => setShowPreview(true);
    const handleMouseLeave = () => setShowPreview(false);

    // Icon Selection
    const Icon = isTopic ? FolderOpen : isItem ? (isImageFile ? ImageIcon : FileText) : Briefcase;

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative shadow-md rounded-sm p-4 w-[160px] min-h-[100px] flex flex-col transition-all duration-200",
                colorClass,
                isItem ? "border shadow-sm hover:shadow-md" : "border-t-2 border-l-2 border-r-2 border-b-4", // Preserve paper look for items, thick border for topics
                "font-sans",
                isDragOver ? "scale-110 shadow-2xl ring-4 ring-green-400 z-50 brightness-110" : "hover:scale-105 hover:shadow-xl",
                // Image specific style
                imageUrl && "p-2 min-h-[140px]"
            )}
            style={{
                // Add slight random rotation for organic feel provided by parent or random here if fixed
                transform: `rotate(${isItem ? 0 : Math.random() * 2 - 1}deg)`,
                transformOrigin: 'top center'
            }}
            onMouseEnter={handleMouseEnter} // Hover handlers
            onMouseLeave={handleMouseLeave}
        >
            {/* Push Pin Visualization */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 filter drop-shadow-md">
                <div className={cn(
                    "w-4 h-4 rounded-full border border-black/20",
                    isTopic ? "bg-red-600" : isItem ? "bg-blue-600" : "bg-yellow-500", // Different pin colors
                    "shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.3),inset_2px_2px_4px_rgba(255,255,255,0.4)]" // Sphere effect
                )} />
                <div className="w-0.5 h-2 bg-black/20 mx-auto -mt-1" /> {/* Pin needle hint */}
            </div>
            {/* Handles for connections */}
            <Handle type="target" position={Position.Top} className="opacity-0" />

            <div className="flex-1 flex flex-col justify-center items-center text-center overflow-hidden">
                {/* Image Preview or Icon */}
                {imageUrl ? (
                    <div className="w-full h-24 mb-2 bg-black/5 rounded overflow-hidden relative group">
                        <img
                            src={imageUrl}
                            alt={data.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            draggable={false}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                ) : (
                    <div className="text-xl mb-1">
                        <Icon className="w-8 h-8 opacity-80" />
                    </div>
                )}


                {/* Title */}
                <h3 className={cn(
                    "font-bold leading-tight line-clamp-3",
                    imageUrl ? "text-xs mt-1" : "text-sm",
                    isTopic ? "text-white" : "text-black/80"
                )}>
                    {data.title}
                </h3>

                {/* Meta info */}
                {isTopic && data.childrenCount > 0 && (
                    <div className="mt-2 text-[10px] opacity-80 font-mono bg-black/10 px-1 rounded text-white">
                        {t('board.containsItems', { count: data.childrenCount })}
                    </div>
                )}
                {/* Quick Info for items */}
                {isItem && !imageUrl && (
                    <div className="mt-1 text-[9px] opacity-60 uppercase tracking-wider text-black">
                        {t('board.document')}
                    </div>
                )}

                {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-sm backdrop-blur-[1px] z-20">
                        <span className="font-bold text-white text-xs uppercase tracking-widest border-2 border-white px-2 py-1 rounded">
                            {isCourse ? t('board.upload') : t('board.assign')}
                        </span>
                    </div>
                )}

                {/* PREVIEW TOOLTIP */}
                {showPreview && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white/95 backdrop-blur-sm rounded-md shadow-xl border border-stone-200 p-2 z-[100] text-left animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none data-[side=bottom]:slide-in-from-top-2">
                        <div className="text-xs font-bold text-stone-800 mb-1 border-b border-stone-100 pb-1 truncate">{data.title}</div>
                        <div className="space-y-1">
                            {isCourse && <div className="text-[10px] text-stone-500">📥 {t('board.upload')}</div>}
                            {isTopic && <div className="text-[10px] text-stone-500">📂 {t('board.containsItems', { count: data.childrenCount })}</div>}
                            {isItem && (
                                <>
                                    <div className="text-[10px] text-stone-600"><span className="font-semibold">{t('board.type')}</span> {data.data?.fileType || 'Doc'}</div>
                                    <div className="text-[10px] text-blue-600 italic">{t('board.doubleClickOpen')}</div>
                                </>
                            )}
                        </div>
                        {/* Decorative Arrow */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-stone-200" />
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
});

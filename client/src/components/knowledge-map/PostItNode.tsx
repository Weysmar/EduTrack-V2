import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { HierarchyNode } from '@/types/knowledge-map';
import { useKnowledgeMapData } from '@/hooks/useKnowledgeMapData';
import { useLanguage } from '@/components/language-provider';

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
    const { assignCourseToFolder } = useKnowledgeMapData();
    const { t } = useLanguage();
    const [isDragOver, setIsDragOver] = useState(false);

    // Determine Color based on Depth or Type
    let colorClass = DepthColors.default;
    if (isTopic) {
        colorClass = DepthColors[data.depth as keyof typeof DepthColors] || DepthColors.default;
    } else {
        colorClass = CourseColor;
    }

    const handleDragOver = (e: React.DragEvent) => {
        if (!isTopic) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        if (!isTopic) return;
        e.preventDefault();
        setIsDragOver(false);

        const courseId = e.dataTransfer.getData('application/reactflow/courseId');
        if (courseId) {
            try {
                await assignCourseToFolder({ courseId, folderId: data.id });
                // Optional: Show toast success
            } catch (err) {
                console.error("Failed to assign course", err);
            }
        }
    };

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
                isDragOver ? "scale-110 shadow-2xl ring-4 ring-green-400 z-50 brightness-110" : "hover:scale-105 hover:shadow-xl"
            )}
            style={{
                // Add slight random rotation for organic feel provided by parent or random here if fixed
                transform: `rotate(${isItem ? 0 : Math.random() * 2 - 1}deg)`,
                transformOrigin: 'top center'
            }}
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

            <div className="flex-1 flex flex-col justify-center items-center text-center">
                {/* Icon */}
                <div className="text-xl mb-1">
                    {isTopic ? '📚' : '📖'}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold leading-tight line-clamp-3">
                    {data.title}
                </h3>

                {/* Meta info */}
                {isTopic && data.childrenCount > 0 && (
                    <div className="mt-2 text-[10px] opacity-80 font-mono bg-black/10 px-1 rounded">
                        {data.childrenCount} children
                    </div>
                )}

                {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-sm backdrop-blur-[1px]">
                        <span className="font-bold text-white text-xs uppercase tracking-widest border-2 border-white px-2 py-1 rounded">
                            {t('action.assign') || 'Assign'}
                        </span>
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
});

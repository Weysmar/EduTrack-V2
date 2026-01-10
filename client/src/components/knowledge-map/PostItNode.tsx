import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { HierarchyNode } from '@/types/knowledge-map';

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

    // Determine Color based on Depth or Type
    let colorClass = DepthColors.default;
    if (isTopic) {
        colorClass = DepthColors[data.depth as keyof typeof DepthColors] || DepthColors.default;
    } else {
        colorClass = CourseColor;
    }

    return (
        <div
            className={cn(
                "relative shadow-md rounded-sm p-4 w-[160px] min-h-[100px] flex flex-col transition-transform hover:scale-105 hover:shadow-xl",
                colorClass,
                "border-t-2 border-l-2 border-r-2 border-b-4", // Thick bottom border for depth
                "font-sans"
            )}
            style={{
                // Add slight random rotation for organic feel provided by parent or random here if fixed
                transform: `rotate(${Math.random() * 2 - 1}deg)`
            }}
        >
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
            </div>

            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
});

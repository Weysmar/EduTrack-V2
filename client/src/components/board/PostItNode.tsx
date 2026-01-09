import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

const colors = {
    yellow: 'bg-yellow-200 border-yellow-300',
    pink: 'bg-pink-200 border-pink-300',
    blue: 'bg-cyan-200 border-cyan-300',
    green: 'bg-green-200 border-green-300',
};

export const PostItNode = memo(({ data, selected }: NodeProps) => {
    const colorClass = colors[data.color as keyof typeof colors] || colors.yellow;

    // We can simulate random rotation if passed in data
    const rotation = data.rotation || 0;

    return (
        <div className={cn(
            "relative w-48 h-48 shadow-lg transition-transform",
            colorClass,
            selected && "ring-2 ring-red-500 scale-105 z-50",
            "flex flex-col p-4 shadow-xl"
        )}
            style={{
                boxShadow: '2px 4px 12px rgba(0,0,0,0.2)',
                transform: `rotate(${rotation}deg)`
            }}
        >
            {/* The Pin (Handle) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                {/* Visual Pin */}
                <div className="w-4 h-4 rounded-full bg-red-600 shadow-sm border border-red-800" />
                <div className="w-1 h-3 bg-black/20 absolute top-2 left-1/2 -translate-x-1/2 rounded-full blur-[1px]"></div>

                {/* Logical Handle (Target/Source mixed for now) */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="w-4 h-4 !bg-transparent !border-0 top-1"
                    isConnectable={true}
                />
                <Handle
                    type="source"
                    position={Position.Top}
                    className="w-4 h-4 !bg-transparent !border-0 top-1"
                    isConnectable={true}
                />
            </div>

            <div className="font-[Caveat] text-2xl leading-tight text-gray-800 flex-1 overflow-hidden"
                style={{ fontFamily: '"Caveat", cursive' }}>
                {data.label}
            </div>

            {data.subLabel && (
                <div className="mt-auto pt-2 border-t border-black/10 text-xs font-mono text-gray-600 opacity-70">
                    {data.subLabel}
                </div>
            )}
        </div>
    );
});

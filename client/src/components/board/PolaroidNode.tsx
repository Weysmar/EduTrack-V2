import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export const PolaroidNode = memo(({ data, selected }: NodeProps) => {
    const rotation = data.rotation || -2;

    return (
        <div className={cn(
            "relative bg-white p-3 pb-12 shadow-xl transition-transform w-56",
            selected && "ring-2 ring-red-500 scale-105 z-50"
        )}
            style={{
                transform: `rotate(${rotation}deg)`
            }}
        >
            {/* The Pin (Handle) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                {/* Visual Pin */}
                <div className="w-4 h-4 rounded-full bg-red-600 shadow-sm border border-red-800" />
                <div className="w-1 h-3 bg-black/20 absolute top-2 left-1/2 -translate-x-1/2 rounded-full blur-[1px]"></div>

                <Handle type="target" position={Position.Top} className="w-4 h-4 !bg-transparent !border-0 top-1" isConnectable={true} />
                <Handle type="source" position={Position.Top} className="w-4 h-4 !bg-transparent !border-0 top-1" isConnectable={true} />
            </div>

            {/* Tape Effect */}
            <div className="absolute -top-4 right-8 w-12 h-6 bg-white/40 rotate-3 backdrop-blur-sm border-white/20 shadow-sm z-0"></div>

            <div className="aspect-square bg-gray-100 overflow-hidden mb-2 border border-black/5">
                {data.image ? (
                    <img src={data.image} alt={data.label} className="w-full h-full object-cover" draggable={false} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-handwriting text-xl">
                        No Image
                    </div>
                )}
            </div>

            <div className="absolute bottom-3 left-0 w-full text-center px-2">
                <div className="font-[Caveat] text-xl text-gray-800 truncate" style={{ fontFamily: '"Caveat", cursive' }}>
                    {data.label}
                </div>
            </div>
        </div>
    );
});

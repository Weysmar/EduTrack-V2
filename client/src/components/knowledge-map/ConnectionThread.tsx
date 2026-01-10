import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

const EdgeColors = {
    0: '#EF4444', // L0 -> L1 (Red)
    1: '#F97316', // L1 -> L2 (Orange)
    2: '#A855F7', // L2 -> L3 (Purple)
    3: '#EC4899', // L3 -> L4 (Pink)
    default: '#9CA3AF'
};

export function ConnectionThread({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data
}: EdgeProps) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const depth = data?.depth || 0;
    const strokeColor = EdgeColors[depth as keyof typeof EdgeColors] || EdgeColors.default;

    return (
        <BaseEdge
            path={edgePath}
            markerEnd={markerEnd}
            style={{
                ...style,
                stroke: strokeColor,
                strokeWidth: 3,
                strokeOpacity: 0.6,
                strokeDasharray: '5,5' // Dashed line for thread effect
            }}
        />
    );
}

export type NodeType = 'topic' | 'course' | 'item';

export interface HierarchyNode {
    id: string;
    title: string;
    type: NodeType;
    parentId: string | null;
    depth: number;
    children: HierarchyNode[];
    resourceCount: number;
    childrenCount: number;

    // Visual properties
    position?: { x: number; y: number };
    isSelected?: boolean;
    isHighlighted?: boolean;
    customColor?: string;
}

export interface MapConnection {
    id: string;
    source: string;
    target: string;
    depth: number; // Inherits child depth
    isVisible: boolean;
}

export interface SavedLayoutPosition {
    id?: number;
    profileId: string;
    nodeId: string;
    x: number;
    y: number;
    timestamp: number;
}

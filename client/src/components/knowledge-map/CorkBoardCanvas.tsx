import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PostItNode } from './PostItNode';
import { ConnectionThread } from './ConnectionThread';
import { useKnowledgeMapData } from '@/hooks/useKnowledgeMapData';
import { HierarchyNode } from '@/types/knowledge-map';

const nodeTypes = {
    postIt: PostItNode
};

const edgeTypes = {
    thread: ConnectionThread
};

export function CorkBoardCanvas() {
    const { rootNodes, savePosition, isLoading } = useKnowledgeMapData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Transform Hierarchy into React Flow Elements (Basic Radial Layout)
    useEffect(() => {
        if (!rootNodes.length) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        const centerX = 0;
        const centerY = 0;

        // Recursive placement function (Simple radial)
        const placeNode = (node: HierarchyNode, x: number, y: number, angleRange: { start: number, end: number }) => {
            // Use saved position if available (handled in hook, but let's confirm)
            const posX = node.position?.x ?? x;
            const posY = node.position?.y ?? y;

            newNodes.push({
                id: node.id,
                type: 'postIt',
                position: { x: posX, y: posY },
                data: node,
            });

            if (node.children.length > 0) {
                const step = (angleRange.end - angleRange.start) / node.children.length;
                const radius = 250 + (node.depth * 50); // Increase radius with depth

                node.children.forEach((child, index) => {
                    const angle = angleRange.start + (step * index) + (step / 2);
                    // If no saved position, calculate radial
                    const childX = node.position ? node.position.x : posX + Math.cos(angle) * radius;
                    const childY = node.position ? node.position.y : posY + Math.sin(angle) * radius;

                    // Add Edge
                    newEdges.push({
                        id: `${node.id}-${child.id}`,
                        source: node.id,
                        target: child.id,
                        type: 'thread',
                        data: { depth: node.depth },
                        animated: false
                    });

                    placeNode(child, childX, childY, {
                        start: angle - (step / 2.5),
                        end: angle + (step / 2.5)
                    });
                });
            }
        };

        // Place roots (usually just one, but can be multiple)
        rootNodes.forEach((root, i) => {
            placeNode(root, i * 500, 0, { start: 0, end: Math.PI * 2 });
        });

        setNodes(newNodes);
        setEdges(newEdges);

    }, [rootNodes, setNodes, setEdges]); // Rerun when data changes

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        savePosition(node.id, node.position.x, node.position.y);
    }, [savePosition]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-white">Loading Map...</div>;
    }

    return (
        <div className="w-full h-full bg-[#C89666] relative overflow-hidden"
            style={{
                backgroundImage: 'url("https://www.transparenttextures.com/patterns/cork-board.png")',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
            }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
            >
                <Background color="#3f2e22" gap={30} size={1} style={{ opacity: 0.1 }} />
                <Controls className="bg-white border text-black" />
                <MiniMap style={{ height: 120 }} zoomable pannable />
            </ReactFlow>
        </div>
    );
}

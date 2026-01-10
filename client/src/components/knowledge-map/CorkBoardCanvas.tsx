import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    useReactFlow,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PostItNode } from './PostItNode';
import { ConnectionThread } from './ConnectionThread';
import { ControlBar } from './ControlBar';
import { FilterPanel } from './FilterPanel';
import { useKnowledgeMapData } from '@/hooks/useKnowledgeMapData';
import { HierarchyNode } from '@/types/knowledge-map';

const nodeTypes = {
    postIt: PostItNode
};

const edgeTypes = {
    thread: ConnectionThread
};

interface MapContentProps {
    searchQuery: string;
    showTopics: boolean;
    showCourses: boolean;
    showDocuments: boolean;
    onToggleTopics: (v: boolean) => void;
    onToggleCourses: (v: boolean) => void;
    onToggleDocuments: (v: boolean) => void;
}

function MapContent({ searchQuery, showTopics, showCourses, showDocuments, onToggleTopics, onToggleCourses, onToggleDocuments }: MapContentProps) {
    const { rootNodes, savePosition, isLoading } = useKnowledgeMapData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    // Transform Hierarchy into React Flow Elements (Basic Radial Layout)
    useEffect(() => {
        if (!rootNodes.length) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Recursive placement function (Balanced Radial)
        const placeNode = (node: HierarchyNode, x: number, y: number, angleRange: { start: number, end: number }, level: number) => {
            const posX = node.position?.x ?? x;
            const posY = node.position?.y ?? y;

            // Filter Logic
            const isTopic = node.type === 'topic';
            const isCourse = node.type === 'course';
            const isItem = node.type === 'item';

            let isVisible = true;
            if (isTopic && !showTopics) isVisible = false;
            if (isCourse && !showCourses) isVisible = false;
            if (isItem && !showDocuments) isVisible = false;

            // Search Logic
            let isMatch = true;
            if (searchQuery) {
                isMatch = node.title.toLowerCase().includes(searchQuery.toLowerCase());
            }

            if (isVisible) {
                newNodes.push({
                    id: node.id,
                    type: 'postIt',
                    position: { x: posX, y: posY },
                    data: {
                        ...node,
                        isHighlighted: searchQuery ? isMatch : false,
                        // If searching, we could dim non-matches or styling them in the Node
                        // For now we pass the flag
                    },
                    style: {
                        opacity: searchQuery && !isMatch ? 0.3 : 1
                    }
                });
            }

            if (node.children.length > 0) {
                const baseRadius = 300;
                const radius = baseRadius + (level * 100) + (node.children.length * 20);

                const totalAngle = angleRange.end - angleRange.start;

                node.children.forEach((child, index) => {
                    const angleStep = totalAngle / node.children.length;
                    const angle = angleRange.start + (angleStep * index) + (angleStep / 2);

                    const childX = node.position ? node.position.x : posX + Math.cos(angle) * radius;
                    const childY = node.position ? node.position.y : posY + Math.sin(angle) * radius;

                    // Edge visibility check
                    const childIsTopic = child.type === 'topic';
                    const childIsCourse = child.type === 'course';
                    const childIsItem = child.type === 'item';

                    let childVisible = true;
                    if (childIsTopic && !showTopics) childVisible = false;
                    if (childIsCourse && !showCourses) childVisible = false;
                    if (childIsItem && !showDocuments) childVisible = false;

                    if (isVisible && childVisible) {
                        newEdges.push({
                            id: `${node.id}-${child.id}`,
                            source: node.id,
                            target: child.id,
                            type: 'thread',
                            data: { depth: child.depth },
                        });
                    }

                    const sectorSize = angleStep * 0.8;
                    placeNode(child, childX, childY, {
                        start: angle - (sectorSize / 2),
                        end: angle + (sectorSize / 2)
                    }, level + 1);
                });
            }
        };

        rootNodes.forEach((root, i) => {
            placeNode(root, i * 1500, 0, { start: 0, end: Math.PI * 2 }, 0);
        });

        setNodes(newNodes);
        setEdges(newEdges);

        // Initial centering
        // We use a small timeout to let the nodes render in React Flow before fitting
        setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 });
        }, 100);

    }, [rootNodes, setNodes, setEdges, fitView, showTopics, showCourses, showDocuments, searchQuery]);

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        savePosition(node.id, node.position.x, node.position.y);
    }, [savePosition]);

    const onNodeDoubleClick = useCallback((event: any, node: Node) => {
        fitView({ nodes: [node], duration: 800, padding: 0.5 });
    }, [fitView]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-[#5D4037] font-serif">Loading Knowledge Map...</div>;
    }

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            minZoom={0.2}
            maxZoom={4}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
            <Background color="#3f2e22" gap={40} size={1} style={{ opacity: 0.05 }} />
            <ControlBar />
            <FilterPanel
                showTopics={showTopics}
                setShowTopics={onToggleTopics}
                showCourses={showCourses}
                setShowCourses={onToggleCourses}
                showDocuments={showDocuments}
                setShowDocuments={onToggleDocuments}
            />
            <MiniMap
                nodeColor={(n) => {
                    if (n.type === 'postIt') return '#8B5E3C';
                    return '#eee';
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
                style={{
                    height: 120,
                    backgroundColor: '#EFEBE9',
                    border: '2px solid #8B5E3C',
                    borderRadius: '8px'
                }}
                zoomable
                pannable
            />
        </ReactFlow>
    );
}

export function CorkBoardCanvas(props: MapContentProps) {
    return (
        <div className="w-full h-full bg-[#C89666] relative overflow-hidden"
            style={{
                // CSS Generated Cork Pattern
                backgroundColor: '#b8865c',
                backgroundImage: `
                    radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1.5px),
                    radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1.5px)
                `,
                backgroundSize: '12px 12px, 15px 15px',
                backgroundPosition: '0 0, 6px 6px',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)'
            }}>
            <ReactFlowProvider>
                <MapContent {...props} />
            </ReactFlowProvider>
        </div>
    );
}

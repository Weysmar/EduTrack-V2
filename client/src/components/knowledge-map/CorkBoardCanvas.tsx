import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useLanguage } from '@/components/language-provider';

const nodeTypes = {
    postIt: PostItNode
};

const edgeTypes = {
    thread: ConnectionThread
};

/** Highlights search matches and dims the other nodes. */
function applySearch(node: Node, query: string): Node {
    const q = query.trim().toLowerCase();
    const isMatch = !q || String(node.data?.title ?? '').toLowerCase().includes(q);
    return {
        ...node,
        data: { ...node.data, isHighlighted: q ? isMatch : false },
        style: { ...node.style, opacity: q && !isMatch ? 0.3 : 1 },
    };
}

interface MapContentProps {
    searchQuery: string;
    showTopics: boolean;
    showCourses: boolean;
    showDocuments: boolean;
    onToggleTopics: (v: boolean) => void;
    onToggleCourses: (v: boolean) => void;
    onToggleDocuments: (v: boolean) => void;
    onClose: () => void;
}

function MapContent({ searchQuery, showTopics, showCourses, showDocuments, onToggleTopics, onToggleCourses, onToggleDocuments, onClose }: MapContentProps) {
    const { t } = useLanguage();
    const { rootNodes, savePosition, isLoading } = useKnowledgeMapData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    const searchRef = useRef(searchQuery);
    searchRef.current = searchQuery;
    const hasFittedRef = useRef(false);
    const lastFilterKeyRef = useRef('');

    // Zen Mode State
    const [isZenMode, setIsZenMode] = useState(false);
    const toggleZen = useCallback(() => setIsZenMode(prev => !prev), []);

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

            if (isVisible) {
                newNodes.push({
                    id: node.id,
                    type: 'postIt',
                    position: { x: posX, y: posY },
                    data: { ...node },
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

        setNodes(newNodes.map(n => applySearch(n, searchRef.current)));
        setEdges(newEdges);

        // Center only on first display and when the filters change (not on data refetch / search).
        const filterKey = `${showTopics}-${showCourses}-${showDocuments}`;
        if (!hasFittedRef.current || lastFilterKeyRef.current !== filterKey) {
            // Small timeout to let the nodes render in React Flow before fitting.
            // Refs are updated in the callback so a cancelled timer is retried on the next run.
            const timer = setTimeout(() => {
                hasFittedRef.current = true;
                lastFilterKeyRef.current = filterKey;
                fitView({ padding: 0.2, duration: 800 });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [rootNodes, setNodes, setEdges, fitView, showTopics, showCourses, showDocuments]);

    // Search only re-styles the existing nodes (debounced): no re-layout, no re-centering.
    useEffect(() => {
        const timer = setTimeout(() => {
            setNodes(nds => nds.map(n => applySearch(n, searchQuery)));
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery, setNodes]);

    const onNodeDragStop = useCallback((event: any, node: Node) => {
        savePosition(node.id, node.position.x, node.position.y);
    }, [savePosition]);

    const navigate = useNavigate();

    const openNode = useCallback((node: Node) => {
        if (node.data.type === 'course') {
            onClose(); // Close modal before navigating
            navigate(`/edu/course/${node.id}`);
        } else if (node.data.type === 'item') {
            const courseId = node.data.courseId || node.data.data?.courseId;
            if (courseId) {
                onClose(); // Close modal before navigating
                navigate(`/edu/course/${courseId}/item/${node.id}`);
            } else {
                // Fallback if courseId is missing (should not happen if data is robust)
                console.warn("Missing courseId for item navigation", node);
                // Try to fallback to finding parent? For now just zoom.
                fitView({ nodes: [node], duration: 800, padding: 0.5 });
            }
        } else {
            fitView({ nodes: [node], duration: 800, padding: 0.5 });
        }
    }, [fitView, navigate, onClose]);

    // Desktop: double-click opens a node (single click selects / drags).
    const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        openNode(node);
    }, [openNode]);

    // Touch devices: double-tap is unreliable, a single tap opens the node.
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const pointerType = (event.nativeEvent as PointerEvent | undefined)?.pointerType;
        const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
        if (pointerType === 'touch' || (!pointerType && isCoarse)) {
            openNode(node);
        }
    }, [openNode]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-[#5D4037] font-serif">{t('common.loading')}</div>;
    }

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            minZoom={0.2}
            maxZoom={4}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
            <Background color="#3f2e22" gap={40} size={1} style={{ opacity: 0.05 }} />
            <ControlBar isZenMode={isZenMode} onToggleZen={toggleZen} />
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

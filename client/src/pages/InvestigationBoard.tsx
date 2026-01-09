import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    BackgroundVariant,
    Panel,
    Node,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useLanguage } from '@/components/language-provider';
import { PostItNode } from '@/components/board/PostItNode';
import { PolaroidNode } from '@/components/board/PolaroidNode';
import { useQuery } from '@tanstack/react-query';
import { courseQueries, itemQueries } from '@/lib/api/queries';
import { useProfileStore } from '@/store/profileStore';
import { API_URL } from '@/config';
import { useAuthStore } from '@/store/authStore';

// Define Custom Node Types
const nodeTypes = {
    postIt: PostItNode,
    polaroid: PolaroidNode,
};

export function InvestigationBoard() {
    const { t } = useLanguage();
    const activeProfile = useProfileStore(state => state.activeProfile);
    const token = useAuthStore(state => state.token);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Data Fetching
    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile
    });

    const { data: items } = useQuery({
        queryKey: ['items'],
        queryFn: itemQueries.getAll,
        enabled: !!activeProfile
    });

    // Transform Data into Board Elements
    useEffect(() => {
        if (!courses || !items) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Simple Layout Config
        let courseX = 0;
        const courseY = 0;
        const courseSpacing = 800; // Space between course clusters

        courses.forEach((course: any) => {
            // 1. Create Course Node (Central)
            const courseNodeId = `course-${course.id}`;
            newNodes.push({
                id: courseNodeId,
                type: 'postIt', // Use PostIt for Course Header for now (or make custom FolderNode)
                position: { x: courseX, y: courseY },
                data: {
                    label: course.title,
                    color: 'yellow',
                    rotation: 0,
                    subLabel: 'CASE FILE'
                },
                // Make it bigger?
                style: { width: 300, height: 200, fontSize: '2rem' }
            });

            // 2. Find Items for this Course
            const courseItems = items.filter((i: any) => i.courseId === course.id);

            // 3. Place Items around Course (Archimedean spiral or random cloud)
            courseItems.forEach((item: any, index: number) => {
                const angle = (index / (courseItems.length + 1)) * 2 * Math.PI; // Circle distribution
                const radius = 350 + (Math.random() * 100); // Random distance
                const x = courseX + Math.cos(angle) * radius;
                const y = courseY + Math.sin(angle) * radius;

                // Determine Node Type
                let type = 'postIt';
                let data: any = {
                    label: item.title,
                    rotation: Math.floor(Math.random() * 10) - 5 // Random rotation -5 to 5 degrees
                };

                if (item.type === 'note') {
                    type = 'postIt';
                    data.color = 'pink';
                    data.subLabel = 'NOTE';
                } else if (item.type === 'resource') {
                    // Check if it's an image or PDF with thumbnail
                    if (item.thumbnailUrl || (item.fileName && item.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                        type = 'polaroid';
                        // Construct Thumbnail URL
                        const thumbUrl = item.thumbnailUrl
                            ? `${API_URL}/storage/proxy/${item.thumbnailUrl.split('/').pop()}?token=${token}`
                            : (item.storageKey ? `${API_URL}/storage/proxy/${item.storageKey}?token=${token}` : item.fileUrl);

                        data.image = thumbUrl;
                    } else {
                        type = 'postIt';
                        data.color = 'blue';
                        data.subLabel = 'EVIDENCE';
                    }
                } else {
                    type = 'postIt';
                    data.color = 'green';
                    data.subLabel = 'EXERCISE';
                }

                const itemId = `item-${item.id}`;
                newNodes.push({
                    id: itemId,
                    type,
                    position: { x, y },
                    data
                });

                // 4. Create Red String Edge
                newEdges.push({
                    id: `e-${courseNodeId}-${itemId}`,
                    source: courseNodeId,
                    target: itemId,
                    type: 'default', // We'll customize this later
                    style: { stroke: '#d62828', strokeWidth: 2 },
                    animated: false,
                });
            });

            // Move to next cluster
            courseX += courseSpacing;
        });

        setNodes(newNodes);
        setEdges(newEdges);

    }, [courses, items, token]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 4rem)' }} className="bg-amber-100 relative overflow-hidden">
            {/* Corkboard CSS Background */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E"), 
                                      radial-gradient(circle, transparent 20%, #8B4513 120%)`,
                    filter: 'sepia(0.5) contrast(1.2)'
                }}
            />

            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] pointer-events-none z-10" />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                className="z-20"
                minZoom={0.1}
                maxZoom={4}
                defaultEdgeOptions={{
                    style: { stroke: '#b91c1c', strokeWidth: 3, opacity: 0.8 },
                }}
            >
                <Controls className="bg-white/90 border-2 border-stone-300 shadow-md text-stone-700 rounded-md" />
                <MiniMap
                    nodeStrokeColor={(n) => '#888'}
                    nodeColor={(n) => {
                        if (n.type === 'postIt') return '#fef08a';
                        if (n.type === 'polaroid') return '#fff';
                        return '#eee';
                    }}
                    maskColor="rgba(87, 60, 20, 0.4)"
                    className="bg-amber-50/50 border-2 border-amber-200/50 rounded shadow-lg"
                />

                <Panel position="top-right" className="bg-white/90 p-2 rounded shadow-lg border border-stone-300 transform rotate-1">
                    <div className="text-sm font-handwriting font-bold text-stone-800">
                        🕵️ {t('board.mode') || "Detective Board"}
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfileStore } from '@/store/profileStore';
import { HierarchyNode } from '@/types/knowledge-map';
import { folderQueries, courseQueries, itemQueries } from '@/lib/api/queries';
import { useMemo, useCallback } from 'react';

const STORAGE_KEY = 'knowledge-map-layout';

export function useKnowledgeMapData() {
    const activeProfile = useProfileStore(state => state.activeProfile);
    const queryClient = useQueryClient();

    // 1. Fetch all Folders (Topics)
    const { data: folders = [] } = useQuery({
        queryKey: ['folders', activeProfile?.id],
        queryFn: folderQueries.getAll,
        enabled: !!activeProfile?.id
    });

    // 2. Fetch all Courses
    const { data: courses = [] } = useQuery({
        queryKey: ['courses', activeProfile?.id],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile?.id
    });

    // 3. Fetch all Items (Documents)
    const { data: items = [] } = useQuery({
        queryKey: ['items', activeProfile?.id],
        queryFn: itemQueries.getAll,
        enabled: !!activeProfile?.id
    });

    // 4. Load Layouts from LocalStorage
    const savedLayoutSnapshot = useMemo(() => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Failed to load map layout', e);
            return {};
        }
    }, [activeProfile?.id]);

    // 5. Build Hierarchy Tree
    const { nodes, orphanCourses } = useMemo(() => {
        if (!folders.length && !courses.length) return { nodes: [], orphanCourses: [] };

        const nodeMap = new Map<string, HierarchyNode>();
        const hierarchy: HierarchyNode[] = [];
        const orphans: any[] = [];

        // Create Topic Nodes from Folders
        folders.forEach((folder: any) => {
            const idStr = String(folder.id);
            nodeMap.set(idStr, {
                id: idStr,
                title: folder.name,
                type: 'topic',
                parentId: folder.parentId ? String(folder.parentId) : null,
                depth: 0,
                children: [],
                childrenCount: 0,
                resourceCount: 0
            });
        });

        // Create Course Nodes and Link to folders
        courses.forEach((course: any) => {
            const parentId = course.folderId ? String(course.folderId) : null;
            const courseIdStr = String(course.id);

            const courseNode: HierarchyNode = {
                id: courseIdStr,
                title: course.title,
                type: 'course',
                parentId: parentId || null,
                depth: 0,
                children: [],
                childrenCount: 0,
                resourceCount: 0
            };

            // Link Items to Course
            const courseItems = items.filter((item: any) => String(item.courseId) === courseIdStr);
            courseItems.forEach((item: any) => {
                courseNode.children.push({
                    id: String(item.id),
                    title: item.title,
                    type: 'item',
                    parentId: courseIdStr,
                    depth: 0,
                    children: [],
                    childrenCount: 0,
                    resourceCount: 0,
                    data: { fileType: item.type } // Store type for icon
                });
                courseNode.resourceCount++;
            });

            if (parentId && nodeMap.has(parentId)) {
                const parent = nodeMap.get(parentId);
                if (parent) {
                    parent.children.push(courseNode);
                    parent.resourceCount++;
                }
            } else {
                orphans.push(course);
            }
        });

        // Build Tree Structure (Folder -> Subfolder)
        folders.forEach((folder: any) => {
            const idStr = String(folder.id);
            const node = nodeMap.get(idStr);
            if (!node) return;

            const parentIdStr = folder.parentId ? String(folder.parentId) : null;
            if (parentIdStr && nodeMap.has(parentIdStr)) {
                const parent = nodeMap.get(parentIdStr);
                parent?.children.push(node);
                parent!.childrenCount++;
            } else {
                hierarchy.push(node);
            }
        });

        // Recursive Depth Calculation and Position recovery
        const traverse = (node: HierarchyNode, depth: number) => {
            node.depth = depth;

            // Allow Saved Position Override from selection
            const profileLayout = savedLayoutSnapshot[activeProfile?.id || 'default'] || {};
            const savedPos = profileLayout[node.id];
            if (savedPos) {
                node.position = { x: savedPos.x, y: savedPos.y };
            }

            node.children.forEach(child => traverse(child, depth + 1));
        };

        hierarchy.forEach(root => traverse(root, 0));

        return { nodes: hierarchy, orphanCourses: orphans };
    }, [folders, courses, items, savedLayoutSnapshot, activeProfile?.id]);

    // Save Position callback
    const savePosition = useCallback((nodeId: string, x: number, y: number) => {
        if (!activeProfile?.id) return;

        try {
            const current = localStorage.getItem(STORAGE_KEY);
            const fullLayout = current ? JSON.parse(current) : {};
            const profileId = activeProfile.id;

            if (!fullLayout[profileId]) fullLayout[profileId] = {};
            fullLayout[profileId][nodeId] = { x, y, timestamp: Date.now() };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(fullLayout));
        } catch (e) {
            console.error('Failed to save node position', e);
        }
    }, [activeProfile?.id]);

    // 5. Assign Course to Folder Mutation
    const { mutateAsync: assignCourseToFolder } = useMutation({
        mutationFn: async ({ courseId, folderId }: { courseId: string, folderId: string }) => {
            await courseQueries.update(courseId, { folderId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        }
    });

    return {
        rootNodes: nodes,
        orphanCourses,
        allFolders: folders,
        savePosition,
        assignCourseToFolder,
        isLoading: false
    };
}

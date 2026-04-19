import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { courseQueries, itemQueries, mindmapQueries, flashcardQueries, quizQueries, summaryQueries } from '@/lib/api/queries'

export interface CourseContentHook {
    course: any;
    isLoading: boolean;
    items: any[];
    allItems: any[];
    totalItems: number;
    itemPages: number;
    refetch: () => void;
}

export function useCourseContent(courseId: string, itemPage = 1, itemLimit = 20): CourseContentHook {
    // 1. Fetch Course Metadata
    const { data: course, isLoading: isCourseLoading } = useQuery({
        queryKey: ['courses', courseId],
        queryFn: () => courseQueries.getOne(courseId),
        enabled: !!courseId
    })

    // 2. Fetch All Content Types
    const { data: itemData, refetch: refetchItems } = useQuery({
        queryKey: ['items', courseId, itemPage],
        queryFn: () => itemQueries.getByCourse(courseId, itemPage, itemLimit),
        enabled: !!courseId
    })

    const items = itemData?.items || []
    const totalItems = itemData?.total || 0
    const itemPages = itemData?.totalPages || 1

    const { data: mindMaps } = useQuery({
        queryKey: ['mindmaps', courseId],
        queryFn: () => mindmapQueries.getAll(courseId),
        enabled: !!courseId
    })

    const { data: flashcardSets } = useQuery({
        queryKey: ['flashcards', courseId],
        queryFn: () => flashcardQueries.getByCourse(courseId),
        enabled: !!courseId
    })

    const { data: quizzes } = useQuery({
        queryKey: ['quizzes', courseId],
        queryFn: () => quizQueries.getByCourse(courseId),
        enabled: !!courseId
    })

    const { data: summaries } = useQuery({
        queryKey: ['summaries', courseId],
        queryFn: () => summaryQueries.getByCourse(courseId),
        enabled: !!courseId
    })

    // 3. Aggregate All Content
    const allItems = useMemo(() => [
        ...(items?.filter((i: any) => i.type !== 'summary') || []),
        ...(mindMaps?.map((m: any) => ({ ...m, type: 'mindmap', title: m.name })) || []),
        ...(flashcardSets?.map((f: any) => ({ ...f, type: 'flashcards', title: f.name })) || []),
        ...(quizzes?.map((q: any) => ({ ...q, type: 'quiz', title: q.name })) || []),
        ...(summaries?.map((s: any) => ({
            ...s,
            type: 'summary',
            title: items?.find((i: any) => i.id === s.itemId)?.title
                ? `Résumé: ${items.find((i: any) => i.id === s.itemId)?.title}`
                : 'Résumé (Sans titre)'
        })) || [])
    ], [items, mindMaps, flashcardSets, quizzes, summaries]);

    const queryClient = useQueryClient()

    const refetch = () => {
        // Invalidate all content queries for this course
        queryClient.invalidateQueries({ queryKey: ['items', courseId] })
        queryClient.invalidateQueries({ queryKey: ['mindmaps', courseId] })
        queryClient.invalidateQueries({ queryKey: ['flashcards', courseId] })
        queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] })
        queryClient.invalidateQueries({ queryKey: ['summaries', courseId] })
        queryClient.invalidateQueries({ queryKey: ['plans', courseId] }) // Good measure
    }

    return {
        course,
        isLoading: isCourseLoading,
        items, // Raw items
        allItems, // Aggregated
        totalItems,
        itemPages,
        refetch
    }
}

import { useQuery } from '@tanstack/react-query'
import { courseQueries, itemQueries, mindmapQueries, flashcardQueries, quizQueries, summaryQueries } from '@/lib/api/queries'

export interface CourseContentHook {
    course: any;
    isLoading: boolean;
    items: any[];
    allItems: any[];
    refetch: () => void;
}

export function useCourseContent(courseId: string): CourseContentHook {
    // 1. Fetch Course Metadata
    const { data: course, isLoading: isCourseLoading } = useQuery({
        queryKey: ['courses', courseId],
        queryFn: () => courseQueries.getOne(courseId),
        enabled: !!courseId
    })

    // 2. Fetch All Content Types
    const { data: items, refetch: refetchItems } = useQuery({
        queryKey: ['items', courseId],
        queryFn: () => itemQueries.getByCourse(courseId),
        enabled: !!courseId
    })

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
    const allItems = [
        ...(items || []),
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
    ];

    const refetch = () => {
        refetchItems()
        // Invalidate others if needed via queryClient in parent, or return all refetches.
        // For simplicity, we assume generic invalidation handles most, but we expose one main refetch.
    }

    return {
        course,
        isLoading: isCourseLoading,
        items, // Raw items if needed
        allItems, // Aggregated
        refetch
    }
}

import { useSearchStore } from '@/store/searchStore'
import { useState, useEffect } from 'react'

export interface SearchResult {
    id: number
    type: 'course' | 'note' | 'exercise' | 'resource' | 'folder'
    title: string
    subtitle?: string
    url: string
    score: number
    date?: Date
}

export function useSearch() {
    const { query } = useSearchStore()
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        const search = async () => {
            if (!query || query.trim().length === 0) {
                setResults([])
                return
            }

            setIsSearching(true)
            const lowerQuery = query.toLowerCase()

            try {
                // Fetch all data from API
                const { courseQueries, itemQueries, folderQueries } = await import('@/lib/api/queries')
                const [courses, items, folders] = await Promise.all([
                    courseQueries.getAll(),
                    itemQueries.getAll(),
                    folderQueries.getAll()
                ])

                const searchResults: SearchResult[] = []

                // Search Courses
                courses.forEach(c => {
                    let score = 0
                    if (c.title.toLowerCase() === lowerQuery) score += 100
                    else if (c.title.toLowerCase().startsWith(lowerQuery)) score += 50
                    else if (c.title.toLowerCase().includes(lowerQuery)) score += 20

                    if (score > 0) {
                        searchResults.push({
                            id: c.id!,
                            type: 'course',
                            title: c.title,
                            subtitle: c.description,
                            url: `/course/${c.id}`,
                            score,
                            date: c.createdAt
                        })
                    }
                })

                // Search Items
                items.forEach(i => {
                    let score = 0
                    if (i.title.toLowerCase() === lowerQuery) score += 100
                    else if (i.title.toLowerCase().startsWith(lowerQuery)) score += 50
                    else if (i.title.toLowerCase().includes(lowerQuery)) score += 20

                    // Boost notes with content match (lower score)
                    if (i.content && i.content.toLowerCase().includes(lowerQuery)) score += 10

                    if (score > 0) {
                        let url = `/course/${i.courseId}`
                        // In a more complex app, we might route to specific item view if it exists
                        // For now, routing to course is safe, maybe with query param?

                        searchResults.push({
                            id: i.id!,
                            type: i.type,
                            title: i.title,
                            subtitle: i.type,
                            url,
                            score,
                            date: i.createdAt
                        })
                    }
                })

                // Search Folders
                folders.forEach(f => {
                    let score = 0
                    if (f.name.toLowerCase() === lowerQuery) score += 100
                    else if (f.name.toLowerCase().startsWith(lowerQuery)) score += 50
                    else if (f.name.toLowerCase().includes(lowerQuery)) score += 20

                    if (score > 0) {
                        searchResults.push({
                            id: f.id!,
                            type: 'folder',
                            title: f.name,
                            url: `/folder/${f.id}`,
                            score,
                            date: f.createdAt
                        })
                    }
                })

                // Sort by score desc
                searchResults.sort((a, b) => b.score - a.score)

                setResults(searchResults)
            } catch (error) {
                console.error("Search failed", error)
            } finally {
                setIsSearching(false)
            }
        }

        const debounce = setTimeout(search, 150)
        return () => clearTimeout(debounce)
    }, [query])

    return { results, isSearching }
}

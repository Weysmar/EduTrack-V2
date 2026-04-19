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
            try {
                const { apiClient } = await import('@/lib/api/client')
                const { data } = await apiClient.get(`/search?q=${encodeURIComponent(query)}`)

                const searchResults: SearchResult[] = data.map((item: any) => ({
                    ...item,
                    date: item.createdAt ? new Date(item.createdAt) : undefined
                }))

                setResults(searchResults)
            } catch (error) {
                console.error("Search failed", error)
                setResults([])
            } finally {
                setIsSearching(false)
            }
        }

        const debounce = setTimeout(search, 300) // Slightly longer debounce for backend hits
        return () => clearTimeout(debounce)
    }, [query])

    return { results, isSearching }
}

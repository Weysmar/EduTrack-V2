import { useState, useMemo, useCallback } from 'react'

export type FilterTab = 'all' | 'exercise' | 'note' | 'resource' | 'flashcards' | 'quiz' | 'mindmap' | 'summary';
export type SortOption = 'alpha' | 'date' | 'last_opened';

export function useCourseFilters(items: any[]) {
    const [activeFilters, setActiveFilters] = useState<FilterTab[]>(['all'])
    const [searchQuery, setSearchQuery] = useState('')
    const [sortOption, setSortOption] = useState<SortOption>('date')
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

    const toggleFilter = useCallback((filter: FilterTab) => {
        setActiveFilters(prev => {
            if (filter === 'all') return ['all']

            const isAll = prev.includes('all')
            let newFilters = isAll ? [] : [...prev]

            if (newFilters.includes(filter)) {
                newFilters = newFilters.filter(f => f !== filter)
            } else {
                newFilters.push(filter)
            }

            if (newFilters.length === 0) return ['all']
            return newFilters
        })
    }, [])

    const filteredItems = useMemo(() => {
        let result = items.filter((item: any) => {
            const matchesTab = activeFilters.includes('all') || activeFilters.includes(item.type as FilterTab)
            const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesTab && matchesSearch
        })

        // Sort logic
        result.sort((a: any, b: any) => {
            if (sortOption === 'alpha') {
                return (a.title || '').localeCompare(b.title || '')
            } else if (sortOption === 'last_opened') {
                const dateA = new Date(a.updatedAt || a.createdAt).getTime();
                const dateB = new Date(b.updatedAt || b.createdAt).getTime();
                return dateB - dateA;
            } else {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
        })

        return result
    }, [items, activeFilters, searchQuery, sortOption])

    const toggleSelection = useCallback((itemId: string) => {
        setSelectedItems(prev => {
            const newSelection = new Set(prev)
            if (newSelection.has(itemId)) {
                newSelection.delete(itemId)
            } else {
                newSelection.add(itemId)
            }
            return newSelection
        })
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set())
    }, [])

    const handleSelectAll = useCallback(() => {
        setSelectedItems(prev => {
            if (prev.size === filteredItems.length && filteredItems.length > 0) {
                return new Set()
            } else {
                return new Set(filteredItems.map(item => item.id))
            }
        })
    }, [filteredItems])

    return {
        activeFilters,
        toggleFilter,
        searchQuery,
        setSearchQuery,
        sortOption,
        setSortOption,
        selectedItems,
        toggleSelection,
        clearSelection,
        handleSelectAll,
        filteredItems
    }
}

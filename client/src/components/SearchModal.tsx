import { useEffect, useRef, useState } from 'react'
import { Search, ArrowRight, FileText, Folder, Book, Dumbbell, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSearchStore } from '@/store/searchStore'
import { useSearch, SearchResult } from '@/hooks/useSearch'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

export function SearchModal() {
    const { isOpen, setIsOpen, query, setQuery } = useSearchStore()
    const { results, isSearching } = useSearch()
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const { t } = useLanguage()

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(true)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setIsOpen])

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            setQuery('')
            setActiveIndex(0)
        }
    }, [isOpen, setQuery])

    // Navigation
    const handleNavigation = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev))
        }
        if (e.key === 'Enter') {
            e.preventDefault()
            if (results[activeIndex]) {
                handleSelect(results[activeIndex])
            }
        }
    }

    const handleSelect = (item: SearchResult) => {
        navigate(item.url)
        setIsOpen(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="w-full max-w-xl bg-card border rounded-xl shadow-2xl relative z-[100] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header / Input */}
                <div className="flex items-center gap-3 p-4 border-b">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleNavigation}
                        placeholder={t('search.placeholder')}
                        className="flex-1 bg-transparent text-lg focus:outline-none placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center gap-2">
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">Esc</span>
                        </kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((item, index) => (
                                <button
                                    key={`${item.type}-${item.id}`}
                                    onClick={() => handleSelect(item)}
                                    className={cn(
                                        "w-full text-left flex items-center gap-3 p-3 rounded-lg transition-colors",
                                        index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                                    )}
                                    onMouseEnter={() => setActiveIndex(index)}
                                >
                                    <div className={cn("p-2 rounded-md bg-muted/50",
                                        index === activeIndex && "bg-background/20"
                                    )}>
                                        {item.type === 'course' && <Book className="h-4 w-4" />}
                                        {item.type === 'folder' && <Folder className="h-4 w-4" />}
                                        {item.type === 'note' && <FileText className="h-4 w-4" />}
                                        {item.type === 'exercise' && <Dumbbell className="h-4 w-4" />}
                                        {item.type === 'resource' && <FolderOpen className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate">{item.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="capitalize">{item.type}</span>
                                            {item.date && <span>• {item.date.toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    {index === activeIndex && <ArrowRight className="h-4 w-4 opacity-50" />}
                                </button>
                            ))}
                        </div>
                    ) : query.trim().length > 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {isSearching ? (
                                <p>{t('search.searching')}</p>
                            ) : (
                                <p>{t('search.noResults')} "{query}"</p>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground/50">
                            <p>{t('search.type')}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between px-4">
                    <span>{results.length} {t('search.results')}</span>
                    <div className="flex gap-2">
                        <span>↑↓ {t('search.nav')}</span>
                        <span>Enter {t('search.select')}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

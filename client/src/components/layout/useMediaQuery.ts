import { useEffect, useState } from 'react'

const getMatch = (query: string) =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false

/** Subscribes to a CSS media query (e.g. '(min-width: 1024px)'). */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => getMatch(query))

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
        const mql = window.matchMedia(query)
        const onChange = () => setMatches(mql.matches)
        onChange()
        mql.addEventListener?.('change', onChange)
        return () => mql.removeEventListener?.('change', onChange)
    }, [query])

    return matches
}

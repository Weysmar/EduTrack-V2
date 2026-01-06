export type AIProvider = 'perplexity' | 'google'
export type SummaryType = 'note' | 'exercise' | 'course' | 'folder' | 'bulk' | 'resource' | 'drive-link'
export type SummaryFormat = 'bullets' | 'paragraph' | 'timeline' | 'outline' | 'mindmap'
export type CompressionLevel = 0.2 | 0.3 | 0.4 | 0.5 // 20%, 30%, 40%, 50%

export interface SummaryOptions {
    provider: AIProvider
    compression: CompressionLevel
    format: SummaryFormat
    preserveHeadings: boolean
    detectKeywords: boolean
    keepFormulas: boolean
    respectHierarchy: boolean // For folders
    useWebSearch: boolean // Perplexity toggler
    includeStats: boolean
    model?: string
    filters?: {
        completedOnly?: boolean
        difficulty?: ('easy' | 'medium' | 'hard')[]
    }
}

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
    provider: 'perplexity', // Defaulting to Perplexity as requested
    compression: 0.4,
    format: 'bullets',
    preserveHeadings: true,
    detectKeywords: true,
    keepFormulas: true,
    includeStats: true,
    respectHierarchy: true,
    useWebSearch: true
}

export interface SummaryStats {
    originalWordCount: number
    summaryWordCount: number
    compressionRatio: number
    processingTimeMs: number
}

export interface SummaryResult {
    id: string
    itemId: string | number
    itemType: SummaryType
    content: string | any // string for text formats, object for mindmap
    stats: SummaryStats
    options: SummaryOptions
    createdAt: number // timestamp
}

export interface ScoringWeights {
    tfidf: number
    position: number
    keywords: number
    length: number
    unicity: number
}

export const SCORING_WEIGHTS: ScoringWeights = {
    tfidf: 0.30,
    position: 0.25,
    keywords: 0.25,
    length: 0.15,
    unicity: 0.05
}

// Worker Messages
export type WorkerMessage =
    | { type: 'GENERATE'; payload: { text: string; options: SummaryOptions; type: SummaryType; id: string | number } }
    | { type: 'RESULT'; payload: SummaryResult }
    | { type: 'ERROR'; payload: string }

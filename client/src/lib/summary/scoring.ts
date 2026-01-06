import { SCORING_WEIGHTS } from './types'

// Keyword Patterns
const PATTERNS = {
    definitions: /\b(is|means|defined as|signifie|est|c'est)\b/i,
    numbers: /\b\d+(\.\d+)?%?|\$\d+|\d{4}\b/,
    dates: /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i,
    formulas: /[=<>≈]|\b(sum|f\(x\)|pi|sigma)\b/i,
    importance: /\b(important|crucial|key|essential|significant|note|remember|conclusion)\b/i
}

export interface SentenceScore {
    index: number
    text: string
    score: number
    details: {
        tfidf: number
        position: number
        keywords: number
        length: number
        unicity: number
    }
}

/**
 * Calculates the score for a single sentence based on multiple factors.
 */
export function calculateSentenceScore(
    sentence: string,
    index: number,
    totalSentences: number,
    docTermFreq: Map<string, number>,
    _totalDocs: number,
    headingBonus: boolean
): SentenceScore {
    const words = sentence.toLowerCase().split(/\W+/).filter(w => w.length > 2)

    // 1. TF-IDF Score (Simplified for single doc context: High frequency rare words)
    // In a real multi-doc system, we'd use global IDF. Here we use local importance.
    // We assume 'docTermFreq' is actually term freq in THIS doc for now, serving as a proxy for "topicality".
    let tfidfScore = 0
    words.forEach(w => {
        const freq = docTermFreq.get(w) || 0
        tfidfScore += freq
    })
    // Normalize by length to avoid bias toward long sentences
    const normalizedTfidf = words.length > 0 ? (tfidfScore / words.length) * 10 : 0
    const tfidfFinal = Math.min(100, normalizedTfidf)

    // 2. Position Score
    let posScore = 0
    if (index === 0) posScore += 30 // First sentence
    else if (index < 5) posScore += 15 // First few sentences
    else if (index > totalSentences - 3) posScore += 10 // Conclusion
    if (headingBonus) posScore += 20 // After a heading
    const posFinal = Math.min(100, posScore)

    // 3. Keyword Score
    let keywordScore = 0
    if (PATTERNS.definitions.test(sentence)) keywordScore += 25
    if (PATTERNS.numbers.test(sentence)) keywordScore += 15
    if (PATTERNS.dates.test(sentence)) keywordScore += 15
    if (PATTERNS.formulas.test(sentence)) keywordScore += 30
    if (PATTERNS.importance.test(sentence)) keywordScore += 20
    const keywordFinal = Math.min(100, keywordScore)

    // 4. Length Score (Optimal 5-25 words)
    const wordCount = words.length
    let lengthScore = 0
    if (wordCount < 3) lengthScore = 10
    else if (wordCount >= 5 && wordCount <= 25) lengthScore = 100
    else if (wordCount > 25 && wordCount <= 50) lengthScore = 70
    else lengthScore = 40 // Too long

    // Unicity is calculated in a second pass context
    const unicityFinal = 100

    // Final Weighted Score
    const totalScore =
        (tfidfFinal * SCORING_WEIGHTS.tfidf) +
        (posFinal * SCORING_WEIGHTS.position) +
        (keywordFinal * SCORING_WEIGHTS.keywords) +
        (lengthScore * SCORING_WEIGHTS.length) +
        (unicityFinal * SCORING_WEIGHTS.unicity)

    return {
        index,
        text: sentence,
        score: totalScore,
        details: {
            tfidf: tfidfFinal,
            position: posFinal,
            keywords: keywordFinal,
            length: lengthScore,
            unicity: unicityFinal
        }
    }
}

export function computeTermFrequency(text: string): Map<string, number> {
    const freq = new Map<string, number>()
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    words.forEach(w => {
        freq.set(w, (freq.get(w) || 0) + 1)
    })
    return freq
}

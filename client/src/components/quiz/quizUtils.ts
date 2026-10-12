// Shared, framework-free helpers for the quiz study flow (QuizStudy / QuizQuestion / QuizReview).

export interface QuizOption {
    originalIndex: number
    text: string
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Normalise `question.options` (array, JSON string, objects) and strip duplicated "A." / "1)" prefixes. */
export function parseQuizOptions(question: any): QuizOption[] {
    if (!question?.options) return []
    let rawOpts = question.options
    if (typeof rawOpts === 'string') {
        try { rawOpts = JSON.parse(rawOpts) } catch { rawOpts = [] }
    }
    if (!Array.isArray(rawOpts)) return []
    return rawOpts.map((opt: any, i: number) => {
        const rawText = typeof opt === 'string' ? opt : (opt?.text ?? String(opt ?? ''))
        return {
            originalIndex: i,
            text: String(rawText).replace(/^[A-Za-z0-9][.)]\s*/, '').trim()
        }
    })
}

const TRUE_WORDS = ['vrai', 'true']
const FALSE_WORDS = ['faux', 'false']

export function isTrueOptionText(text: string): boolean {
    return TRUE_WORDS.includes(text.trim().toLowerCase())
}

export function isTrueFalseOptions(options: QuizOption[]): boolean {
    if (options.length !== 2) return false
    const texts = options.map(o => o.text.trim().toLowerCase())
    return (texts.includes('vrai') && texts.includes('faux')) || (texts.includes('true') && texts.includes('false'))
}

/** True when `selected` is a real answer (not skipped / unanswered) matching the correct one. */
export function isAnswerCorrect(question: any, selected: number | null | undefined): boolean {
    if (selected === null || selected === undefined || selected === -1) return false
    return Number(selected) === Number(question?.correctAnswer)
}

/** Display label of an option: its letter (A, B…) for multiple choice. */
export function optionLetter(options: QuizOption[], originalIndex: number): string {
    const pos = options.findIndex(o => o.originalIndex === Number(originalIndex))
    if (pos === -1) return ''
    return OPTION_LETTERS[pos] || String(pos + 1)
}

export function optionText(options: QuizOption[], originalIndex: number | null | undefined): string {
    if (originalIndex === null || originalIndex === undefined || originalIndex < 0) return ''
    return options.find(o => o.originalIndex === Number(originalIndex))?.text ?? ''
}

// AZERTY top row without Shift produces & é " ' instead of 1 2 3 4.
const AZERTY_DIGITS: Record<string, number> = { '&': 0, 'é': 1, '"': 2, "'": 3 }

/**
 * Map a keyboard `event.key` to an option's originalIndex, layout-independent
 * (uses the produced character, not the physical key code):
 *  - a/b/c/d (any case) and 1-4 (top row, numpad, AZERTY & é " ')
 *  - V/T = Vrai/True and F = Faux/False on true/false questions
 * Returns null when the key is not a shortcut for this question.
 */
export function getOptionIndexForKey(key: string, options: QuizOption[]): number | null {
    if (!key || options.length === 0) return null
    const k = key.length === 1 ? key.toLowerCase() : key

    if (isTrueFalseOptions(options)) {
        if (k === 'v' || k === 't') return options.find(o => isTrueOptionText(o.text))?.originalIndex ?? null
        if (k === 'f') return options.find(o => FALSE_WORDS.includes(o.text.trim().toLowerCase()))?.originalIndex ?? null
    }

    let pos: number | null = null
    if (/^[1-9]$/.test(k)) pos = Number(k) - 1
    else if (k in AZERTY_DIGITS) pos = AZERTY_DIGITS[k]
    else if (/^[a-f]$/.test(k)) pos = k.charCodeAt(0) - 97

    if (pos === null || pos >= options.length) return null
    return options[pos].originalIndex
}

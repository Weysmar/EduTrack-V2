import { describe, it, expect } from 'vitest'
import { getOptionIndexForKey, isAnswerCorrect, parseQuizOptions, isTrueFalseOptions, optionLetter } from './quizUtils'

describe('quizUtils', () => {
    const mcq = parseQuizOptions({ options: ['A. Paris', 'B) Lyon', 'Marseille', 'Lille'] })

    it('parses options and strips letter prefixes', () => {
        expect(mcq.map(o => o.text)).toEqual(['Paris', 'Lyon', 'Marseille', 'Lille'])
        expect(parseQuizOptions({ options: '["x","y"]' }).length).toBe(2)
        expect(parseQuizOptions({ options: 'not json' })).toEqual([])
    })

    it('maps layout-independent keys to options', () => {
        expect(getOptionIndexForKey('a', mcq)).toBe(0)
        expect(getOptionIndexForKey('D', mcq)).toBe(3)
        expect(getOptionIndexForKey('2', mcq)).toBe(1)
        expect(getOptionIndexForKey('é', mcq)).toBe(1)
        expect(getOptionIndexForKey('"', mcq)).toBe(2)
        expect(getOptionIndexForKey('5', mcq)).toBeNull()
        expect(getOptionIndexForKey('q', mcq)).toBeNull()
        expect(getOptionIndexForKey('Enter', mcq)).toBeNull()
    })

    it('maps V/T/F on true/false questions regardless of option order', () => {
        const tf = parseQuizOptions({ options: ['Faux', 'Vrai'] })
        expect(isTrueFalseOptions(tf)).toBe(true)
        expect(getOptionIndexForKey('v', tf)).toBe(1)
        expect(getOptionIndexForKey('t', tf)).toBe(1)
        expect(getOptionIndexForKey('F', tf)).toBe(0)
        expect(getOptionIndexForKey('1', tf)).toBe(0)
    })

    it('never counts skipped or unanswered questions as correct', () => {
        const q = { correctAnswer: 0 }
        expect(isAnswerCorrect(q, 0)).toBe(true)
        expect(isAnswerCorrect(q, -1)).toBe(false)
        expect(isAnswerCorrect(q, null)).toBe(false)
        expect(isAnswerCorrect(q, undefined)).toBe(false)
        expect(isAnswerCorrect({ correctAnswer: '2' }, 2)).toBe(true)
    })

    it('returns option letters', () => {
        expect(optionLetter(mcq, 2)).toBe('C')
        expect(optionLetter(mcq, 9)).toBe('')
    })
})

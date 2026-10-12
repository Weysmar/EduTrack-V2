import { describe, it, expect } from 'vitest'
import { calculateNextReview } from './spaced-repetition'

const NOW = new Date(2026, 9, 12, 10, 0, 0)

describe('calculateNextReview', () => {
    it('resets to 1 day and lowers ease on "again"', () => {
        const r = calculateNextReview(10, 2.5, 'again', NOW)
        expect(r.interval).toBe(1)
        expect(r.easeFactor).toBe(2.3)
        expect(r.nextReview.getDate()).toBe(13)
    })

    it('keeps the existing progression for good / easy / hard', () => {
        expect(calculateNextReview(0, 2.5, 'good', NOW).interval).toBe(1)
        expect(calculateNextReview(1, 2.5, 'good', NOW).interval).toBe(3)
        expect(calculateNextReview(4, 2.5, 'good', NOW).interval).toBe(10)
        expect(calculateNextReview(1, 2.5, 'easy', NOW).interval).toBe(7)
        expect(calculateNextReview(5, 2.5, 'hard', NOW).interval).toBe(6)
    })

    it('never lets ease drop below 1.3', () => {
        expect(calculateNextReview(3, 1.35, 'again', NOW).easeFactor).toBe(1.3)
    })

    it('handles null / undefined values from legacy rows', () => {
        const r = calculateNextReview(null, undefined, 'good', NOW)
        expect(r.interval).toBe(1)
        expect(r.easeFactor).toBe(2.5)
        expect(Number.isNaN(r.nextReview.getTime())).toBe(false)
    })

    it('nextReview matches the returned interval', () => {
        const r = calculateNextReview(3, 2.5, 'good', NOW)
        const expected = new Date(NOW)
        expected.setDate(expected.getDate() + r.interval)
        expect(r.nextReview.getTime()).toBe(expected.getTime())
    })
})

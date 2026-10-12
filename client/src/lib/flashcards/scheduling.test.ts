import { describe, it, expect } from 'vitest'
import { buildPracticeQueue, buildReviewQueue, getDeckStats, isDueCard, isNewCard, formatRelativeDay } from './scheduling'

const NOW = new Date(2026, 9, 12, 10, 0, 0)
const day = (offset: number, hour = 10) => new Date(2026, 9, 12 + offset, hour, 0, 0).toISOString()

const cards = [
    { id: 'new1', interval: 1, nextReview: day(0), lastReviewed: null },
    { id: 'overdue', interval: 3, nextReview: day(-2), lastReviewed: day(-5) },
    { id: 'laterToday', interval: 1, nextReview: day(0, 20), lastReviewed: day(-1, 20) },
    { id: 'tomorrowA', interval: 1, nextReview: day(1, 8), lastReviewed: day(0, 8) },
    { id: 'tomorrowB', interval: 1, nextReview: day(1, 22), lastReviewed: day(0, 9) },
    { id: 'nextWeek', interval: 7, nextReview: day(7), lastReviewed: day(0) },
]

describe('scheduling', () => {
    it('classifies new and due cards (day-granular)', () => {
        expect(isNewCard(cards[0])).toBe(true)
        expect(isDueCard(cards[0], NOW)).toBe(false)
        expect(isDueCard(cards[1], NOW)).toBe(true)
        expect(isDueCard(cards[2], NOW)).toBe(true) // later today counts as due
        expect(isDueCard(cards[3], NOW)).toBe(false)
    })

    it('computes deck stats with next review date and count', () => {
        const stats = getDeckStats(cards, NOW)
        expect(stats).toMatchObject({ total: 6, due: 2, new: 1, toStudy: 3, nextReviewCount: 2 })
        expect(stats.nextReviewDate?.getDate()).toBe(13)
    })

    it('handles missing card arrays', () => {
        expect(getDeckStats(undefined, NOW)).toMatchObject({ total: 0, toStudy: 0, nextReviewDate: null })
    })

    it('review queue = due cards (oldest first) then new cards; never not-due cards', () => {
        expect(buildReviewQueue(cards, NOW).map(c => c.id)).toEqual(['overdue', 'laterToday', 'new1'])
    })

    it('review queue is empty when everything is scheduled in the future', () => {
        expect(buildReviewQueue(cards.slice(3), NOW)).toEqual([])
    })

    it('practice queue contains every card', () => {
        expect(buildPracticeQueue(cards)).toHaveLength(cards.length)
    })

    it('formats relative days', () => {
        expect(formatRelativeDay(new Date(day(1)), NOW, 'fr-FR')).toBe('demain')
        expect(formatRelativeDay(new Date(day(1)), NOW, 'en-US')).toBe('tomorrow')
    })
})

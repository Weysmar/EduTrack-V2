import { describe, it, expect } from 'vitest'
import { answerCurrent, createSession, currentCardId, getSessionSummary, isFirstAnswer, isSessionComplete, MAX_REQUEUES } from './session'

describe('study session queue', () => {
    it('re-queues "again" cards at the end and completes once all are passed', () => {
        let s = createSession(['a', 'b'], 'review')
        s = answerCurrent(s, 'again') // a failed
        expect(s.queue).toEqual(['a', 'b', 'a'])
        expect(isFirstAnswer(s, 'a')).toBe(false)
        s = answerCurrent(s, 'good') // b
        expect(currentCardId(s)).toBe('a')
        expect(isSessionComplete(s)).toBe(false)
        s = answerCurrent(s, 'good') // a passed on retry
        expect(isSessionComplete(s)).toBe(true)

        const summary = getSessionSummary(s)
        expect(summary).toMatchObject({ reviewed: 2, answers: 3, correctFirstTry: 1, accuracy: 50, relearned: 1, failed: 0 })
    })

    it('stops re-queuing after MAX_REQUEUES', () => {
        let s = createSession(['a'], 'practice')
        for (let i = 0; i <= MAX_REQUEUES; i++) s = answerCurrent(s, 'again')
        expect(isSessionComplete(s)).toBe(true)
        expect(s.results.a.attempts).toBe(MAX_REQUEUES + 1)
        expect(getSessionSummary(s).failed).toBe(1)
    })

    it('ignores answers once complete and deduplicates ids', () => {
        let s = createSession(['a', 'a'], 'review')
        expect(s.queue).toEqual(['a'])
        s = answerCurrent(s, 'easy')
        expect(answerCurrent(s, 'easy')).toBe(s)
    })
})

import { Flashcard } from '@/lib/types';

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

interface ReviewResult {
    interval: number; // days
    easeFactor: number;
    nextReview: Date;
}

/**
 * Calculates the next review schedule based on an SM-2 inspired algorithm.
 * 
 * Rules:
 * - 'again': Reset interval to 1 day (or very short), drop ease factor.
 * - 'hard': Keep current interval (or 1.2x), drop ease factor slightly.
 * - 'good': Standard interval multiplier (x easeFactor).
 * - 'easy': Bonus interval multiplier (x easeFactor * 1.3), boost ease factor.
 */
export function calculateNextReview(
    currentInterval: number,
    currentEaseFactor: number,
    grade: ReviewGrade
): ReviewResult {
    let nextInterval: number;
    let nextEaseFactor = currentEaseFactor;

    // Minimum ease factor to prevent getting stuck
    const MIN_EASE = 1.3;

    if (grade === 'again') {
        // Reset
        nextInterval = 1; // 1 day (technically should be minutes in a session, but simplified to 1 day for database logic)
        nextEaseFactor = Math.max(MIN_EASE, currentEaseFactor - 0.2);
    } else if (grade === 'hard') {
        // Struggle: Interval stays similar (1.2x just to move forward) or flattened
        nextInterval = Math.max(1, currentInterval * 1.2);
        nextEaseFactor = Math.max(MIN_EASE, currentEaseFactor - 0.15);
    } else if (grade === 'good') {
        // Standard progression
        if (currentInterval === 0) nextInterval = 1;
        else if (currentInterval === 1) nextInterval = 3;
        else nextInterval = Math.ceil(currentInterval * currentEaseFactor);

        // Ease factor stays same or slight adjust? SM-2 usually adjusts only on grade variability.
        // We'll keep it stable for 'good'.
    } else { // 'easy'
        // Bonus progression
        if (currentInterval === 0) nextInterval = 4;
        else if (currentInterval === 1) nextInterval = 7;
        else nextInterval = Math.ceil(currentInterval * currentEaseFactor * 1.3);

        nextEaseFactor = currentEaseFactor + 0.15;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + nextInterval);

    return {
        interval: nextInterval,
        easeFactor: Number(nextEaseFactor.toFixed(2)),
        nextReview
    };
}

// Initial state for a new card
export const INITIAL_CARD_STATE = {
    interval: 0,
    easeFactor: 2.5,
    repCount: 0,
    correctCount: 0,
    totalTime: 0
};

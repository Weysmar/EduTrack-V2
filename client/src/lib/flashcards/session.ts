import type { ReviewGrade } from './spaced-repetition';

/**
 * In-session queue logic (pure, framework-agnostic).
 *
 * - Every card is shown once. The FIRST answer of a card in a session is the real
 *   review (the caller persists the schedule for it in "review" mode).
 * - Cards rated "again" are re-queued at the end of the session (up to
 *   MAX_REQUEUES times) as re-learning steps. Those later answers never change
 *   scheduling, so a failed card stays scheduled for tomorrow.
 * - The session is complete when the queue is exhausted, i.e. every card has been
 *   answered correctly at least once (or ran out of re-queues).
 */

export type SessionMode = 'review' | 'practice';

export const MAX_REQUEUES = 3;

export interface CardResult {
    cardId: string;
    attempts: number;
    firstGrade: ReviewGrade;
    lastGrade: ReviewGrade;
    /** Answered with something other than "again" at least once. */
    passed: boolean;
    requeues: number;
}

export interface SessionState {
    mode: SessionMode;
    queue: string[];
    position: number;
    results: Record<string, CardResult>;
}

export interface SessionSummary {
    /** Distinct cards answered. */
    reviewed: number;
    /** Total answers, including re-learning steps. */
    answers: number;
    /** Cards answered correctly on the first try. */
    correctFirstTry: number;
    /** Percentage (0-100) of cards answered correctly on the first try. */
    accuracy: number;
    /** Cards that were failed at least once but eventually passed. */
    relearned: number;
    /** Cards that never passed (ran out of re-queues). */
    failed: number;
}

export function createSession(cardIds: string[], mode: SessionMode): SessionState {
    // Deduplicate while keeping order.
    const queue = Array.from(new Set(cardIds));
    return { mode, queue, position: 0, results: {} };
}

export const currentCardId = (state: SessionState): string | undefined => state.queue[state.position];

export const isSessionComplete = (state: SessionState): boolean => state.position >= state.queue.length;

/** True when the next answer for this card is its first one in the session (i.e. it should be scheduled). */
export const isFirstAnswer = (state: SessionState, cardId: string): boolean => !state.results[cardId];

/** Number of answers still expected, including pending re-learning steps already queued. */
export const remainingCount = (state: SessionState): number => Math.max(0, state.queue.length - state.position);

export function answerCurrent(state: SessionState, grade: ReviewGrade): SessionState {
    const cardId = currentCardId(state);
    if (!cardId) return state;

    const prev = state.results[cardId];
    const passed = grade !== 'again';
    const requeues = prev?.requeues ?? 0;
    const shouldRequeue = !passed && requeues < MAX_REQUEUES;

    const result: CardResult = {
        cardId,
        attempts: (prev?.attempts ?? 0) + 1,
        firstGrade: prev?.firstGrade ?? grade,
        lastGrade: grade,
        passed: (prev?.passed ?? false) || passed,
        requeues: shouldRequeue ? requeues + 1 : requeues,
    };

    return {
        ...state,
        queue: shouldRequeue ? [...state.queue, cardId] : state.queue,
        position: state.position + 1,
        results: { ...state.results, [cardId]: result },
    };
}

export function getSessionSummary(state: SessionState): SessionSummary {
    const results = Object.values(state.results);
    const reviewed = results.length;
    const answers = results.reduce((acc, r) => acc + r.attempts, 0);
    const correctFirstTry = results.filter(r => r.firstGrade !== 'again').length;
    const relearned = results.filter(r => r.firstGrade === 'again' && r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const accuracy = reviewed === 0 ? 0 : Math.round((correctFirstTry / reviewed) * 100);
    return { reviewed, answers, correctFirstTry, accuracy, relearned, failed };
}

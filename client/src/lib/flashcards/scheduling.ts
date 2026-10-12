/**
 * Pure helpers to classify flashcards (new / due / scheduled) and build study queues.
 *
 * "Due" is day-granular (like Anki): a card whose nextReview falls anywhere today
 * is due now, so a card reviewed yesterday evening is available this morning.
 */

export interface SchedulableCard {
    id: string;
    front?: string;
    back?: string;
    setId?: string;
    interval?: number | null;
    easeFactor?: number | null;
    nextReview?: string | Date | null;
    lastReviewed?: string | Date | null;
}

export interface DeckStats {
    total: number;
    /** Previously reviewed cards whose review date has arrived. */
    due: number;
    /** Cards never reviewed yet. */
    new: number;
    /** due + new: what a review session will contain. */
    toStudy: number;
    /** Earliest upcoming review date among cards that are not due (null if none). */
    nextReviewDate: Date | null;
    /** Number of cards scheduled on the same calendar day as nextReviewDate. */
    nextReviewCount: number;
}

const toTime = (value: string | Date | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
};

/** Start of the next local calendar day: everything strictly before it is due "today". */
export const startOfTomorrow = (now: Date): Date => {
    const d = new Date(now.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
};

const sameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const isNewCard = (card: SchedulableCard): boolean => toTime(card.lastReviewed) === null;

export const isDueCard = (card: SchedulableCard, now: Date = new Date()): boolean => {
    if (isNewCard(card)) return false;
    const next = toTime(card.nextReview);
    if (next === null) return true; // reviewed but never scheduled: treat as due
    if (card.interval === 0) return true;
    return next < startOfTomorrow(now).getTime();
};

/** A card belongs in a (scheduled) review session if it is new or due. */
export const isStudyableCard = (card: SchedulableCard, now: Date = new Date()): boolean =>
    isNewCard(card) || isDueCard(card, now);

export function getDeckStats(cards: SchedulableCard[] | null | undefined, now: Date = new Date()): DeckStats {
    const list = Array.isArray(cards) ? cards : [];
    let due = 0;
    let fresh = 0;
    let nextTime: number | null = null;
    const upcoming: number[] = [];

    for (const card of list) {
        if (isNewCard(card)) {
            fresh++;
        } else if (isDueCard(card, now)) {
            due++;
        } else {
            const t = toTime(card.nextReview);
            if (t !== null) {
                upcoming.push(t);
                if (nextTime === null || t < nextTime) nextTime = t;
            }
        }
    }

    const nextReviewDate = nextTime === null ? null : new Date(nextTime);
    const nextReviewCount = nextReviewDate
        ? upcoming.filter(t => sameLocalDay(new Date(t), nextReviewDate)).length
        : 0;

    return { total: list.length, due, new: fresh, toStudy: due + fresh, nextReviewDate, nextReviewCount };
}

const byNextReviewAsc = (a: SchedulableCard, b: SchedulableCard) =>
    (toTime(a.nextReview) ?? 0) - (toTime(b.nextReview) ?? 0);

/** Scheduled session: overdue-first due cards, then new cards in their original order. */
export function buildReviewQueue<T extends SchedulableCard>(cards: T[] | null | undefined, now: Date = new Date()): T[] {
    const list = Array.isArray(cards) ? cards : [];
    const due = list.filter(c => isDueCard(c, now)).sort(byNextReviewAsc);
    const fresh = list.filter(c => isNewCard(c));
    return [...due, ...fresh];
}

/** Practice (cram) session: every card, soonest scheduled first. */
export function buildPracticeQueue<T extends SchedulableCard>(cards: T[] | null | undefined): T[] {
    const list = Array.isArray(cards) ? cards : [];
    return [...list].sort(byNextReviewAsc);
}

/**
 * Human-friendly relative day ("demain", "dans 3 jours", or a date beyond a week).
 * Uses Intl so it follows the UI locale without extra translation keys.
 */
export function formatRelativeDay(date: Date, now: Date, locale: string): string {
    const startOf = (d: Date) => {
        const c = new Date(d.getTime());
        c.setHours(0, 0, 0, 0);
        return c.getTime();
    };
    const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
    try {
        if (days >= 0 && days <= 6) {
            return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
        }
        return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
        return date.toLocaleDateString();
    }
}

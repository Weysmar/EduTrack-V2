import { rrulestr, RRuleSet } from 'rrule';

export interface ICalEvent {
    id: string;
    summary: string;
    description?: string;
    start: Date;
    end?: Date;
    location?: string;
    allDay: boolean;
    isTask?: boolean;
    isCompleted?: boolean;
    feedId?: string;
    feedName?: string;
    feedColor?: string;
    rrule?: string;
    exdates?: Date[];
    recurrenceId?: Date;
}

export class ICalParser {
    static parse(icsContent: string): ICalEvent[] {
        if (!icsContent) return [];

        const rawEvents: ICalEvent[] = [];
        
        // 1. Unfold lines (RFC 5545: lines folded with CRLF + space/tab)
        const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').replace(/\r[ \t]/g, '');
        const lines = unfolded.split(/\r\n|\n|\r/);
        
        let currentEvent: Partial<ICalEvent> | null = null;
        let inEvent = false;
        let pendingDuration: string | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('BEGIN:VEVENT')) {
                inEvent = true;
                pendingDuration = null;
                currentEvent = {
                    id: Math.random().toString(36).substring(2, 9),
                    allDay: false,
                    isTask: false,
                    isCompleted: false
                };
                continue;
            }

            if (line.startsWith('BEGIN:VTODO')) {
                inEvent = true;
                pendingDuration = null;
                currentEvent = {
                    id: Math.random().toString(36).substring(2, 9),
                    allDay: true,
                    isTask: true,
                    isCompleted: false
                };
                continue;
            }

            if (line.startsWith('END:VEVENT') || line.startsWith('END:VTODO')) {
                inEvent = false;
                if (currentEvent && currentEvent.summary) {
                    if (!currentEvent.start) {
                        currentEvent.start = currentEvent.end || new Date();
                    }

                    // If DURATION was parsed but no DTEND was set
                    if (!currentEvent.end && pendingDuration && currentEvent.start) {
                        const durMs = this.parseDuration(pendingDuration);
                        if (durMs > 0) {
                            currentEvent.end = new Date(currentEvent.start.getTime() + durMs);
                        }
                    }

                    // Default end date if still not specified
                    if (!currentEvent.end && currentEvent.start) {
                        if (currentEvent.allDay) {
                            currentEvent.end = new Date(currentEvent.start.getTime() + 24 * 60 * 60 * 1000);
                        } else {
                            currentEvent.end = new Date(currentEvent.start.getTime() + 60 * 60 * 1000);
                        }
                    }

                    rawEvents.push(currentEvent as ICalEvent);
                }
                currentEvent = null;
                pendingDuration = null;
                continue;
            }

            if (inEvent && currentEvent) {
                const colonIndex = line.indexOf(':');
                if (colonIndex === -1) continue;

                const nameAndParams = line.substring(0, colonIndex);
                const value = line.substring(colonIndex + 1);

                if (nameAndParams === 'SUMMARY' || nameAndParams.startsWith('SUMMARY;')) {
                    currentEvent.summary = this.unescapeText(value);
                } else if (nameAndParams === 'DTSTART' || nameAndParams.startsWith('DTSTART;') || nameAndParams.startsWith('DTSTART:')) {
                    const { date, allDay } = this.parseDate(line);
                    currentEvent.start = date;
                    currentEvent.allDay = allDay;
                } else if (nameAndParams === 'DTEND' || nameAndParams.startsWith('DTEND;') || nameAndParams.startsWith('DTEND:')) {
                    const { date } = this.parseDate(line);
                    currentEvent.end = date;
                } else if (nameAndParams === 'DURATION' || nameAndParams.startsWith('DURATION;') || nameAndParams.startsWith('DURATION:')) {
                    pendingDuration = value.trim();
                } else if (nameAndParams === 'RRULE' || nameAndParams.startsWith('RRULE;') || nameAndParams.startsWith('RRULE:')) {
                    currentEvent.rrule = value.trim();
                } else if (nameAndParams === 'EXDATE' || nameAndParams.startsWith('EXDATE;') || nameAndParams.startsWith('EXDATE:')) {
                    const parts = value.split(',');
                    for (const p of parts) {
                        if (p.trim()) {
                            const { date } = this.parseDate(`:${p.trim()}`);
                            if (!currentEvent.exdates) currentEvent.exdates = [];
                            currentEvent.exdates.push(date);
                        }
                    }
                } else if (nameAndParams === 'RECURRENCE-ID' || nameAndParams.startsWith('RECURRENCE-ID;') || nameAndParams.startsWith('RECURRENCE-ID:')) {
                    const { date } = this.parseDate(line);
                    currentEvent.recurrenceId = date;
                } else if (nameAndParams === 'DUE' || nameAndParams.startsWith('DUE;') || nameAndParams.startsWith('DUE:')) {
                    const { date, allDay } = this.parseDate(line);
                    if (!currentEvent.start) {
                        currentEvent.start = date;
                    }
                    currentEvent.end = date;
                    currentEvent.allDay = allDay;
                } else if (nameAndParams === 'STATUS' || nameAndParams.startsWith('STATUS;')) {
                    const statusVal = value.trim().toUpperCase();
                    if (statusVal === 'COMPLETED') {
                        currentEvent.isCompleted = true;
                    }
                } else if (nameAndParams === 'DESCRIPTION' || nameAndParams.startsWith('DESCRIPTION;')) {
                    currentEvent.description = this.unescapeText(value);
                } else if (nameAndParams === 'LOCATION' || nameAndParams.startsWith('LOCATION;')) {
                    currentEvent.location = this.unescapeText(value);
                } else if (nameAndParams === 'UID' || nameAndParams.startsWith('UID;')) {
                    currentEvent.id = value.trim();
                }
            }
        }

        // 2. Expand recurring event series (RRULE)
        return this.expandRecurringEvents(rawEvents);
    }

    private static expandRecurringEvents(rawEvents: ICalEvent[]): ICalEvent[] {
        const result: ICalEvent[] = [];

        // Collect overrides by UID
        const overridesByUid = new Map<string, ICalEvent[]>();
        for (const ev of rawEvents) {
            if (ev.recurrenceId) {
                const existing = overridesByUid.get(ev.id) || [];
                existing.push(ev);
                overridesByUid.set(ev.id, existing);
            }
        }

        // Expanded window: from 6 months in the past to 18 months in the future
        const now = Date.now();
        const windowStart = new Date(now - 180 * 24 * 60 * 60 * 1000);
        const windowEnd = new Date(now + 540 * 24 * 60 * 60 * 1000);

        for (const ev of rawEvents) {
            // Overridden instances are kept directly
            if (ev.recurrenceId) {
                result.push(ev);
                continue;
            }

            // Non-recurring event: keep as is
            if (!ev.rrule) {
                result.push(ev);
                continue;
            }

            // Recurring event with RRULE
            try {
                const durationMs = ev.end
                    ? ev.end.getTime() - ev.start.getTime()
                    : (ev.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);

                const cleanRrule = ev.rrule.replace(/^RRULE:/i, '').trim();
                const rule = rrulestr(cleanRrule, { dtstart: ev.start });
                const rruleSet = new RRuleSet();
                rruleSet.rrule(rule);

                // Add explicit EXDATEs
                if (ev.exdates && ev.exdates.length > 0) {
                    for (const ex of ev.exdates) {
                        rruleSet.exdate(ex);
                    }
                }

                // Add modified instances (RECURRENCE-ID) to EXDATE so master doesn't duplicate them
                const overrides = overridesByUid.get(ev.id) || [];
                for (const ov of overrides) {
                    if (ov.recurrenceId) {
                        rruleSet.exdate(ov.recurrenceId);
                    }
                }

                // Expand instances within viewing window
                const occurrences = rruleSet.between(windowStart, windowEnd, true);

                if (occurrences.length === 0) {
                    result.push(ev);
                    continue;
                }

                for (const occ of occurrences) {
                    result.push({
                        ...ev,
                        id: `${ev.id}_${occ.getTime()}`,
                        start: occ,
                        end: new Date(occ.getTime() + durationMs),
                        rrule: undefined
                    });
                }
            } catch (err) {
                console.warn(`[ICalParser] Failed to expand recurrence for "${ev.summary}":`, err);
                result.push(ev);
            }
        }

        return result;
    }

    private static unescapeText(text: string): string {
        return text
            .replace(/\\n/gi, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\')
            .trim();
    }

    public static parseDuration(value: string): number {
        const regex = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i;
        const matches = value.trim().match(regex);
        if (!matches) return 0;

        const sign = matches[1] === '-' ? -1 : 1;
        const weeks = parseInt(matches[2] || '0', 10);
        const days = parseInt(matches[3] || '0', 10);
        const hours = parseInt(matches[4] || '0', 10);
        const minutes = parseInt(matches[5] || '0', 10);
        const seconds = parseInt(matches[6] || '0', 10);

        const totalMs = (
            weeks * 7 * 24 * 60 * 60 +
            days * 24 * 60 * 60 +
            hours * 60 * 60 +
            minutes * 60 +
            seconds
        ) * 1000;

        return sign * totalMs;
    }

    private static parseDate(line: string): { date: Date; allDay: boolean } {
        const colonIndex = line.indexOf(':');
        const params = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1).trim();

        let allDay = false;
        if (params.includes('VALUE=DATE') || value.length === 8) {
            allDay = true;
        }

        const year = parseInt(value.substring(0, 4), 10);
        const month = parseInt(value.substring(4, 6), 10) - 1;
        const day = parseInt(value.substring(6, 8), 10);

        let hours = 0, minutes = 0, seconds = 0;
        if (value.includes('T')) {
            const timePart = value.split('T')[1].replace('Z', '');
            hours = parseInt(timePart.substring(0, 2), 10) || 0;
            minutes = parseInt(timePart.substring(2, 4), 10) || 0;
            seconds = parseInt(timePart.substring(4, 6), 10) || 0;
        }

        const isUTC = value.endsWith('Z');

        let date: Date;
        if (isUTC) {
            date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        } else {
            date = new Date(year, month, day, hours, minutes, seconds);
        }

        return { date, allDay };
    }
}

/**
 * Vérifie si un événement s'étend sur plusieurs jours civils.
 */
export function isMultiDayEvent(event: ICalEvent): boolean {
    if (!event.start) return false;
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : null;
    if (!end) return false;

    if (event.allDay) {
        // En RFC 5545, pour VALUE=DATE, DTEND est non-inclusif (fin exclusive à 00:00).
        // Si DTEND > DTSTART + 1 jour, l'événement couvre au moins 2 jours civils.
        const diffMs = end.getTime() - start.getTime();
        return diffMs > 24 * 60 * 60 * 1000;
    }

    // Pour un événement avec heure :
    // Vérifie s'il commence et finit sur des jours civils différents
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // Si la fin est exactement à 00:00:00 du jour suivant, il s'est terminé à minuit pile du jour de départ
    if (endDay.getTime() > startDay.getTime()) {
        if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
            const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
            return diffDays > 1;
        }
        return true;
    }

    return false;
}

/**
 * Détermine si un événement iCal (journée entière ou avec heure, mono ou multi-jours)
 * est actif sur un jour civil donné.
 */
export function isEventOnDay(event: ICalEvent, day: Date): boolean {
    if (!event.start) return false;

    const evStart = new Date(event.start);
    let evEnd: Date;
    if (event.end) {
        evEnd = new Date(event.end);
    } else if (event.allDay) {
        evEnd = new Date(evStart.getTime() + 24 * 60 * 60 * 1000);
    } else {
        evEnd = new Date(evStart.getTime() + 60 * 60 * 1000);
    }

    if (evEnd <= evStart) {
        evEnd = event.allDay
            ? new Date(evStart.getTime() + 24 * 60 * 60 * 1000)
            : new Date(evStart.getTime() + 30 * 60 * 1000);
    }

    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);

    // L'événement chevauche la journée si evStart < dayEnd ET evEnd > dayStart
    return evStart.getTime() < dayEnd.getTime() && evEnd.getTime() > dayStart.getTime();
}

/**
 * Calcule les minutes de début et de fin (0..1440) pour un événement horaire sur un jour précis.
 * Gère le découpage automatique pour les événements nocturnes ou multi-jours.
 */
export function getEventMinutesForDay(
    event: ICalEvent,
    day: Date
): { startMinutes: number; endMinutes: number } | null {
    if (!isEventOnDay(event, day)) return null;

    const evStart = new Date(event.start);
    const evEnd = event.end
        ? new Date(event.end)
        : new Date(evStart.getTime() + 60 * 60 * 1000);

    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);

    let startMinutes = 0;
    if (evStart.getTime() >= dayStart.getTime()) {
        startMinutes = evStart.getHours() * 60 + evStart.getMinutes();
    }

    let endMinutes = 1440;
    if (evEnd.getTime() <= dayEnd.getTime()) {
        endMinutes = evEnd.getHours() * 60 + evEnd.getMinutes();
    }

    // Cas où l'événement finit exactement à minuit pile (00:00 du lendemain)
    if (endMinutes === 0 && evEnd.getTime() >= dayEnd.getTime()) {
        endMinutes = 1440;
    }

    const duration = Math.max(20, endMinutes - startMinutes);
    return {
        startMinutes,
        endMinutes: Math.min(1440, startMinutes + duration)
    };
}

import { apiClient } from './api/client';

export const fetchICalFeed = async (url: string): Promise<ICalEvent[]> => {
    try {
        const response = await apiClient.get('/calendar/proxy', {
            params: { url },
            responseType: 'text'
        });

        return ICalParser.parse(response.data);
    } catch (error) {
        console.error("iCal Fetch Error:", error);
        throw error;
    }
}

export interface ICalFeedTarget {
    id: string;
    name: string;
    url: string;
    color?: string;
    enabled?: boolean;
}

/**
 * Récupère et fusionne en parallèle plusieurs flux iCal.
 * Chaque événement est étiqueté avec l'ID, le nom et la couleur de son flux d'origine.
 * Tolérant aux pannes : si un flux échoue, les événements des autres flux restent disponibles.
 */
export const fetchAllICalFeeds = async (feeds: ICalFeedTarget[]): Promise<ICalEvent[]> => {
    const activeFeeds = feeds.filter(f => f.enabled !== false && f.url && f.url.trim());
    if (activeFeeds.length === 0) return [];

    const results = await Promise.allSettled(
        activeFeeds.map(async (feed) => {
            const events = await fetchICalFeed(feed.url.trim());
            return events.map(e => ({
                ...e,
                id: `${feed.id}-${e.id}`,
                feedId: feed.id,
                feedName: feed.name,
                feedColor: feed.color || '#3b82f6',
            }));
        })
    );

    const merged: ICalEvent[] = [];
    results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
            merged.push(...res.value);
        } else {
            console.warn(`[ICalParser] Échec du chargement du flux "${activeFeeds[index].name}":`, res.reason);
        }
    });

    return merged;
};

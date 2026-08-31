export interface ICalEvent {
    id: string;
    summary: string;
    description?: string;
    start: Date;
    end?: Date;
    location?: string;
    allDay: boolean;
}

export class ICalParser {
    static parse(icsContent: string): ICalEvent[] {
        if (!icsContent) return [];

        const events: ICalEvent[] = [];
        
        // 1. Unfold lines (RFC 5545: lines folded with CRLF + space/tab)
        const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').replace(/\r[ \t]/g, '');
        const lines = unfolded.split(/\r\n|\n|\r/);
        
        let currentEvent: Partial<ICalEvent> | null = null;
        let inEvent = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('BEGIN:VEVENT')) {
                inEvent = true;
                currentEvent = {
                    id: Math.random().toString(36).substring(2, 9),
                    allDay: false
                };
                continue;
            }

            if (line.startsWith('END:VEVENT')) {
                inEvent = false;
                if (currentEvent && currentEvent.summary && currentEvent.start) {
                    events.push(currentEvent as ICalEvent);
                }
                currentEvent = null;
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
                } else if (nameAndParams === 'DESCRIPTION' || nameAndParams.startsWith('DESCRIPTION;')) {
                    currentEvent.description = this.unescapeText(value);
                } else if (nameAndParams === 'LOCATION' || nameAndParams.startsWith('LOCATION;')) {
                    currentEvent.location = this.unescapeText(value);
                } else if (nameAndParams === 'UID' || nameAndParams.startsWith('UID;')) {
                    currentEvent.id = value.trim();
                }
            }
        }

        return events;
    }

    private static unescapeText(text: string): string {
        return text
            .replace(/\\n/gi, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\')
            .trim();
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

import { apiClient } from './api/client';

export const fetchICalFeed = async (url: string): Promise<ICalEvent[]> => {
    try {
        // Use our backend proxy to fetch the iCal feed
        // This avoids CORS issues and is more reliable than public proxies
        const response = await apiClient.get('/calendar/proxy', {
            params: { url },
            // Ensure we get text back, not JSON (though axios might try to parse JSON if content-type is json)
            // But our backend returns text/calendar.
            responseType: 'text'
        });

        return ICalParser.parse(response.data);
    } catch (error) {
        console.error("iCal Fetch Error:", error);
        throw error;
    }
}

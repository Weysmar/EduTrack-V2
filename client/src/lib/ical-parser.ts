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
        const events: ICalEvent[] = [];
        const lines = icsContent.split(/\r\n|\n|\r/);
        let currentEvent: Partial<ICalEvent> | null = null;
        let inEvent = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('BEGIN:VEVENT')) {
                inEvent = true;
                currentEvent = {};
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
                if (line.startsWith('SUMMARY:')) {
                    currentEvent.summary = line.substring(8);
                } else if (line.startsWith('DTSTART')) {
                    const { date, allDay } = this.parseDate(line);
                    currentEvent.start = date;
                    currentEvent.allDay = allDay;
                } else if (line.startsWith('DTEND')) {
                    const { date } = this.parseDate(line);
                    currentEvent.end = date;
                } else if (line.startsWith('DESCRIPTION:')) {
                    currentEvent.description = line.substring(12);
                } else if (line.startsWith('UID:')) {
                    currentEvent.id = line.substring(4);
                }
            }
        }

        return events;
    }

    private static parseDate(line: string): { date: Date; allDay: boolean } {
        // Handle DTSTART;VALUE=DATE:20230101
        // Handle DTSTART:20230101T120000Z
        const parts = line.split(':');
        const params = parts[0].split(';');
        const value = parts[1];

        let allDay = false;
        if (params.some(p => p === 'VALUE=DATE')) {
            allDay = true;
        }

        // Simple ISO8601 basic format parsing
        // 20230101 or 20230101T120000Z
        const year = parseInt(value.substring(0, 4));
        const month = parseInt(value.substring(4, 6)) - 1;
        const day = parseInt(value.substring(6, 8));

        let hours = 0, minutes = 0, seconds = 0;
        if (value.includes('T')) {
            const timePart = value.split('T')[1];
            hours = parseInt(timePart.substring(0, 2));
            minutes = parseInt(timePart.substring(2, 4));
            seconds = parseInt(timePart.substring(4, 6));
        }

        // Note: This minimal parser assumes UTC ("Z") or local time for simplicity. 
        // A robust parser would handle Timezones (TZID).
        const date = new Date(year, month, day, hours, minutes, seconds);
        return { date, allDay };
    }
}

export const fetchICalFeed = async (url: string): Promise<ICalEvent[]> => {
    try {
        // Add cache busting to the specific Google Calendar URL
        // Check if URL already has query params
        const separator = url.includes('?') ? '&' : '?';
        const uniqueUrl = `${url}${separator}nocache=${Date.now()}`;

        // Use a CORS proxy to bypass browser restrictions
        // Trying corsproxy.io as it is often more reliable
        const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(uniqueUrl);

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            // Fallback to allorigins if first one fails
            console.warn("Primary proxy failed, trying fallback...");
            const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(uniqueUrl)}`;
            const fallbackResponse = await fetch(fallbackUrl);
            if (!fallbackResponse.ok) throw new Error("Failed to fetch ICS from both proxies");
            const text = await fallbackResponse.text();
            return ICalParser.parse(text);
        }

        const text = await response.text();
        return ICalParser.parse(text);
    } catch (error) {
        console.error("iCal Fetch Error:", error);
        throw error;
    }
}

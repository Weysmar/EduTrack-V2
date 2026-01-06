export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
    colorId?: string;
}

export const fetchCalendarEvents = async (accessToken: string, timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> => {
    const min = timeMin ? timeMin.toISOString() : new Date().toISOString();
    // Default max to 1 month from now if not specified
    const max = timeMax ? timeMax.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${min}&timeMax=${max}&singleEvents=true&orderBy=startTime`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Calendar API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        throw error;
    }
};

export const fetchUserProfile = async (accessToken: string) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error("Failed to fetch user profile", error);
    }
    return null;
};

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { addDays } from 'date-fns';

export interface CalendarFeedInfo {
    token: string;
    feedUrl: string;
    webcalUrl: string;
}

/**
 * Normalizes string for iCalendar RFC 5545 format
 */
const escapeIcs = (str: string): string => {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n')
        .trim();
};

/**
 * Formats a Date into UTC iCalendar timestamp: YYYYMMDDTHHmmssZ
 */
const formatIcsDateTime = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Gets an existing calendar token or generates a new one stored in Profile.settings
 */
export const getOrGenerateCalendarToken = async (profileId: string): Promise<string> => {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, settings: true }
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    const settings = (profile.settings as Record<string, any>) || {};
    if (settings.calendarToken && typeof settings.calendarToken === 'string') {
        return `${profile.id}.${settings.calendarToken}`;
    }

    const secretHex = crypto.randomBytes(16).toString('hex');
    const updatedSettings = { ...settings, calendarToken: secretHex };

    await prisma.profile.update({
        where: { id: profileId },
        data: { settings: updatedSettings }
    });

    return `${profile.id}.${secretHex}`;
};

/**
 * Regenerates the calendar token (invalidates old link)
 */
export const regenerateCalendarToken = async (profileId: string): Promise<string> => {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, settings: true }
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    const settings = (profile.settings as Record<string, any>) || {};
    const secretHex = crypto.randomBytes(16).toString('hex');
    const updatedSettings = { ...settings, calendarToken: secretHex };

    await prisma.profile.update({
        where: { id: profileId },
        data: { settings: updatedSettings }
    });

    return `${profile.id}.${secretHex}`;
};

/**
 * Validates a feed token and returns the corresponding profile
 */
export const verifyCalendarToken = async (token: string) => {
    if (!token || !token.includes('.')) return null;

    const [profileId, secretHex] = token.split('.');
    if (!profileId || !secretHex) return null;

    const profile = await prisma.profile.findUnique({
        where: { id: profileId }
    });

    if (!profile) return null;

    const settings = (profile.settings as Record<string, any>) || {};
    if (settings.calendarToken !== secretHex) {
        return null;
    }

    return profile;
};

/**
 * Generates RFC 5545 compliant iCalendar (.ics) string containing all user tasks, deadlines & study sessions
 */
export const generateIcsFeed = async (profileId: string, baseUrl: string): Promise<string> => {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId }
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    // 1. Fetch study tasks (exercises, exams, assignments, revisions, etc.)
    const tasks = await prisma.studyTask.findMany({
        where: {
            plan: { profileId }
        },
        include: {
            week: true,
            course: true,
            item: true
        },
        orderBy: { dayNumber: 'asc' }
    });

    // 2. Fetch standalone exercises with a due date that might not be in study tasks
    const linkedItemIds = new Set(tasks.map(t => t.itemId).filter(Boolean));
    const standaloneExercises = await prisma.item.findMany({
        where: {
            profileId,
            type: 'exercise',
            dueDate: { not: null },
            id: { notIn: Array.from(linkedItemIds) as string[] }
        },
        include: {
            course: true
        }
    });

    // 3. Fetch study sessions
    const sessions = await prisma.studySession.findMany({
        where: { profileId },
        include: { course: true }
    });

    const nowStr = formatIcsDateTime(new Date());

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EduTrack//EduTrack Calendar 2.0//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeIcs(`EduTrack (${profile.name})`)}`,
        `NAME:${escapeIcs(`EduTrack (${profile.name})`)}`,
        'X-WR-CALDESC:Échéances, exercices et tâches d\'étude EduTrack',
        'DESCRIPTION:Échéances, exercices et tâches d\'étude EduTrack',
        'X-WR-TIMEZONE:Europe/Paris',
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
        'X-PUBLISHED-TTL:PT1H'
    ];

    // Helper to add task VEVENT
    for (const task of tasks) {
        if (!task.week || !task.week.startDate) continue;

        const taskDate = addDays(new Date(task.week.startDate), task.dayNumber - 1);
        const durationMinutes = task.durationMinutes || 45;

        // Default start at 09:00 UTC (or adjust for typical morning planning)
        const start = new Date(taskDate);
        start.setUTCHours(9, 0, 0, 0);
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

        const typeLabels: Record<string, string> = {
            exercise: '🏋️ Exercice : ',
            exam: '🎓 Examen : ',
            assignment: '📝 Devoir : ',
            revision: '📖 Révision : ',
            project: '👥 Projet : ',
            task: '📌 Tâche : '
        };

        const prefix = typeLabels[task.type] || '📌 ';
        const summary = `${prefix}${task.description}`;

        let desc = '';
        if (task.course?.title) desc += `Cours : ${task.course.title}\n`;
        if (task.item?.title) desc += `Document : ${task.item.title}\n`;
        if (task.item?.content) {
            const cleanContent = task.item.content.replace(/<[^>]*>?/gm, '').trim();
            if (cleanContent) {
                desc += `Instructions :\n${cleanContent.slice(0, 400)}${cleanContent.length > 400 ? '...' : ''}\n`;
            }
        }
        desc += `Statut : ${task.isCompleted ? 'Terminé ✅' : 'À faire ⏳'}\n`;
        if (task.itemId && task.courseId) {
            desc += `Ouvrir dans EduTrack : ${baseUrl}/edu/course/${task.courseId}/item/${task.itemId}\n`;
        }

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:task-${task.id}@edutrack`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:${escapeIcs(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
        lines.push(`CATEGORIES:${escapeIcs(task.type.toUpperCase())},EDUTRACK`);
        lines.push(`STATUS:${task.isCompleted ? 'COMPLETED' : 'CONFIRMED'}`);
        if (task.itemId && task.courseId) {
            lines.push(`URL:${baseUrl}/edu/course/${task.courseId}/item/${task.itemId}`);
        }
        lines.push('END:VEVENT');
    }

    // Helper for standalone exercises
    for (const ex of standaloneExercises) {
        if (!ex.dueDate) continue;

        const start = new Date(ex.dueDate);
        // Default 1 hour block
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const summary = `🏋️ Exercice : ${ex.title}`;
        let desc = '';
        if (ex.course?.title) desc += `Cours : ${ex.course.title}\n`;
        if (ex.content) {
            const cleanContent = ex.content.replace(/<[^>]*>?/gm, '').trim();
            if (cleanContent) {
                desc += `Instructions :\n${cleanContent.slice(0, 400)}${cleanContent.length > 400 ? '...' : ''}\n`;
            }
        }
        desc += `Statut : ${ex.status === 'completed' ? 'Terminé ✅' : 'À faire ⏳'}\n`;
        desc += `Ouvrir dans EduTrack : ${baseUrl}/edu/course/${ex.courseId}/item/${ex.id}\n`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:exercise-${ex.id}@edutrack`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:${escapeIcs(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
        lines.push('CATEGORIES:EXERCISE,EDUTRACK');
        lines.push(`STATUS:${ex.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`);
        lines.push(`URL:${baseUrl}/edu/course/${ex.courseId}/item/${ex.id}`);
        lines.push('END:VEVENT');
    }

    // Helper for study sessions
    for (const session of sessions) {
        const start = new Date(session.startTime || session.date);
        const end = new Date(start.getTime() + (session.durationMinutes || 60) * 60 * 1000);

        const summary = `⏱️ Session : ${session.course?.title || session.type}`;
        let desc = `Type : ${session.type}\nDurée : ${session.durationMinutes} min\n`;
        if (session.notes) desc += `Notes : ${session.notes}\n`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:session-${session.id}@edutrack`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:${escapeIcs(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
        lines.push('CATEGORIES:SESSION,EDUTRACK');
        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    // RFC 5545 requires CRLF line endings
    return lines.join('\r\n') + '\r\n';
};

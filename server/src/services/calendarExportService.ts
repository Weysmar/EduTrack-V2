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
 * Resilient: accepts profileId.secretHex, profileId alone (UUID), or secretHex
 */
export const verifyCalendarToken = async (token: string) => {
    if (!token) return null;

    // Remove .ics if present
    const cleanToken = token.endsWith('.ics') ? token.slice(0, -4) : token;

    // 1. If format is profileId.secretHex
    if (cleanToken.includes('.')) {
        const [profileId, secretHex] = cleanToken.split('.');
        if (profileId) {
            const profile = await prisma.profile.findUnique({
                where: { id: profileId }
            });
            if (profile) return profile;
        }
    }

    // 2. If token is directly a Profile UUID (e.g. f82c4c52-9748-4e05-b3df-a4cae87338...)
    try {
        const profileById = await prisma.profile.findUnique({
            where: { id: cleanToken }
        });
        if (profileById) return profileById;
    } catch (e) {
        // Not a direct match by UUID
    }

    // 3. Fallback: match by prefix or secretHex in settings
    try {
        const profiles = await prisma.profile.findMany();
        for (const p of profiles) {
            if (cleanToken.startsWith(p.id) || p.id.startsWith(cleanToken)) {
                return p;
            }
            const settings = (p.settings as Record<string, any>) || {};
            if (settings.calendarToken && (settings.calendarToken === cleanToken || cleanToken.endsWith(settings.calendarToken))) {
                return p;
            }
        }
    } catch (e) {
        console.error('Error finding profile for calendar token:', e);
    }

    return null;
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
            OR: [
                { plan: { profileId } },
                { course: { profileId } }
            ]
        },
        include: {
            week: true,
            course: true,
            item: true,
            plan: true
        },
        orderBy: { dayNumber: 'asc' }
    });

    // 2. Fetch all standalone items with a dueDate (exercises, notes, assignments, etc.)
    const linkedItemIds = new Set(tasks.map(t => t.itemId).filter(Boolean));
    const itemsWithDueDate = await prisma.item.findMany({
        where: {
            profileId,
            dueDate: { not: null },
            id: { notIn: Array.from(linkedItemIds) as string[] }
        },
        include: {
            course: true
        }
    });

    // 3. Fetch study plans with deadlines
    const plans = await prisma.studyPlan.findMany({
        where: {
            profileId,
            deadline: { not: null }
        },
        include: {
            course: true
        }
    });

    // 4. Fetch study sessions
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
        'X-WR-CALDESC:Échéances, exercices et cours EduTrack',
        'DESCRIPTION:Échéances, exercices et cours EduTrack',
        'X-WR-TIMEZONE:Europe/Paris',
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
        'X-PUBLISHED-TTL:PT1H'
    ];

    let eventCount = 0;

    // Helper to add task VEVENT
    for (const task of tasks) {
        if (!task.week || !task.week.startDate) continue;

        const taskDate = addDays(new Date(task.week.startDate), task.dayNumber - 1);
        const durationMinutes = task.durationMinutes || 45;

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
        if (task.plan?.title) desc += `Plan : ${task.plan.title}\n`;
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
        eventCount++;
    }

    // Helper for standalone items with dueDate (exercises, notes, assignments, etc.)
    for (const item of itemsWithDueDate) {
        if (!item.dueDate) continue;

        const start = new Date(item.dueDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const typeLabels: Record<string, string> = {
            exercise: '🏋️ Exercice : ',
            exam: '🎓 Examen : ',
            assignment: '📝 Devoir : ',
            revision: '📖 Révision : ',
            note: '📌 Note : ',
            summary: '📑 Résumé : ',
            resource: '📁 Ressource : '
        };
        const prefix = typeLabels[item.type] || '📌 ';
        const summary = `${prefix}${item.title}`;

        let desc = '';
        if (item.course?.title) desc += `Cours : ${item.course.title}\n`;
        if (item.content) {
            const cleanContent = item.content.replace(/<[^>]*>?/gm, '').trim();
            if (cleanContent) {
                desc += `Instructions :\n${cleanContent.slice(0, 400)}${cleanContent.length > 400 ? '...' : ''}\n`;
            }
        }
        desc += `Statut : ${item.status === 'completed' ? 'Terminé ✅' : 'À faire ⏳'}\n`;
        desc += `Ouvrir dans EduTrack : ${baseUrl}/edu/course/${item.courseId}/item/${item.id}\n`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:item-${item.id}@edutrack`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:${escapeIcs(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
        lines.push(`CATEGORIES:${escapeIcs(item.type.toUpperCase())},EDUTRACK`);
        lines.push(`STATUS:${item.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`);
        lines.push(`URL:${baseUrl}/edu/course/${item.courseId}/item/${item.id}`);
        lines.push('END:VEVENT');
        eventCount++;
    }

    // Helper for study plans with deadline
    for (const plan of plans) {
        if (!plan.deadline) continue;

        const start = new Date(plan.deadline);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours

        const summary = `🎓 Échéance / Objectif : ${plan.title}`;
        let desc = '';
        if (plan.course?.title) desc += `Cours : ${plan.course.title}\n`;
        if (plan.goal) desc += `Objectif : ${plan.goal}\n`;
        desc += `Heures prévues/semaine : ${plan.hoursPerWeek}h\n`;
        desc += `Statut : ${plan.status === 'completed' ? 'Terminé ✅' : 'En cours 🚀'}\n`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:plan-${plan.id}@edutrack`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:${escapeIcs(summary)}`);
        lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
        lines.push('CATEGORIES:PLAN,EXAM,EDUTRACK');
        lines.push(`STATUS:${plan.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`);
        lines.push('END:VEVENT');
        eventCount++;
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
        eventCount++;
    }

    // If the agenda is completely empty, provide an informative event so Google Calendar confirms connection immediately
    if (eventCount === 0) {
        const today = new Date();
        const start = new Date(today);
        start.setUTCHours(9, 0, 0, 0);
        const end = new Date(start.getTime() + 30 * 60 * 1000);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:welcome-sync-${profile.id}@edutrack`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART:${formatIcsDateTime(start)}`);
        lines.push(`DTEND:${formatIcsDateTime(end)}`);
        lines.push(`SUMMARY:✨ EduTrack connecté avec succès`);
        lines.push(`DESCRIPTION:Votre Google Agenda est bien synchronisé avec EduTrack. Vos exercices, révisions et plannings d'études apparaîtront ici automatiquement dès que vous en créerez avec une date.`);
        lines.push('CATEGORIES:EDUTRACK');
        lines.push('STATUS:CONFIRMED');
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    // RFC 5545 requires CRLF line endings
    return lines.join('\r\n') + '\r\n';
};

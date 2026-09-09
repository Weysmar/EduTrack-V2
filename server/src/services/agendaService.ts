import { prisma } from '../lib/prisma';
import { startOfWeek, endOfWeek } from 'date-fns';

export interface ExerciseAgendaTaskParams {
    profileId: string;
    description: string;
    date: Date | string;
    courseId?: string | null;
    itemId?: string | null;
}

/**
 * Automatically adds or updates an Exercise deadline in the user's Agenda (StudyTasks/Calendar)
 */
export const addOrUpdateExerciseAgendaTask = async ({
    profileId,
    description,
    date,
    courseId,
    itemId
}: ExerciseAgendaTaskParams) => {
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
        console.warn(`[AgendaService] Invalid date provided for exercise agenda task: ${date}`);
        return null;
    }

    // 1. Verify / find or create default "Mon Planning" study plan
    let defaultPlan = await prisma.studyPlan.findFirst({
        where: { profileId, title: "Mon Planning" },
        include: { weeks: true }
    });

    if (!defaultPlan) {
        let initialCourseId = courseId;
        if (!initialCourseId) {
            let course = await prisma.course.findFirst({ where: { profileId } });
            if (!course) {
                course = await prisma.course.create({
                    data: {
                        profileId,
                        title: "Général",
                        color: "#8b5cf6"
                    }
                });
            }
            initialCourseId = course.id;
        }

        defaultPlan = await prisma.studyPlan.create({
            data: {
                profileId,
                courseId: initialCourseId,
                title: "Mon Planning",
                goal: "Tâches et révisions personnelles",
                deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                hoursPerWeek: 5,
                status: 'active'
            },
            include: { weeks: true }
        });
    }

    // 2. Find or create a week that covers targetDate
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    let week = await prisma.studyWeek.findFirst({
        where: {
            planId: defaultPlan.id,
            startDate: { lte: targetDate },
            endDate: { gte: targetDate }
        }
    });

    if (!week) {
        week = await prisma.studyWeek.create({
            data: {
                planId: defaultPlan.id,
                weekNumber: (defaultPlan.weeks?.length || 0) + 1,
                startDate: weekStart,
                endDate: weekEnd,
                topics: ["Agenda"],
                status: "current"
            }
        });
    }

    // Compute dayNumber: 1 = Monday, 7 = Sunday
    const dayOfWeek = targetDate.getDay();
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

    // 3. Check if a task is already associated with this exercise item
    let existingTask = itemId ? await prisma.studyTask.findFirst({
        where: {
            itemId,
            plan: { profileId }
        }
    }) : null;

    if (existingTask) {
        return await (prisma.studyTask as any).update({
            where: { id: existingTask.id },
            data: {
                weekId: week.id,
                planId: defaultPlan.id,
                dayNumber,
                description: description.trim(),
                courseId: courseId || null,
                type: 'exercise'
            }
        });
    } else {
        return await (prisma.studyTask as any).create({
            data: {
                weekId: week.id,
                planId: defaultPlan.id,
                courseId: courseId || null,
                itemId: itemId || null,
                dayNumber,
                description: description.trim(),
                durationMinutes: 45,
                type: 'exercise',
                isCompleted: false
            }
        });
    }
};

/**
 * Removes any agenda task associated with an exercise item
 */
export const removeExerciseAgendaTask = async (itemId: string, profileId: string) => {
    try {
        return await prisma.studyTask.deleteMany({
            where: {
                itemId,
                plan: { profileId }
            }
        });
    } catch (error) {
        console.error(`[AgendaService] Error removing exercise agenda task for item ${itemId}:`, error);
    }
};

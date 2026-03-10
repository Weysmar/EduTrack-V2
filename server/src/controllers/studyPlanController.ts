import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

interface AuthRequest extends Request<any, any, any, any> {
    user?: { id: string, profileId: string };
}

// POST /api/study-plans
export const createStudyPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, title, goal, deadline, hoursPerWeek } = req.body;
        const profileId = req.user?.id;

        // Type validation: ensure weeks is an array before calling .map
        if (!Array.isArray(req.body.weeks)) {
            return res.status(400).json({ error: 'weeks must be an array' });
        }
        const weeks: any[] = req.body.weeks;

        const result = await prisma.studyPlan.create({
            data: {
                profileId: profileId!,
                courseId,
                title,
                goal,
                deadline: new Date(deadline),
                hoursPerWeek,
                status: 'active',
                weeks: {
                    create: weeks.map((week: any) => ({
                        weekNumber: week.weekNumber,
                        startDate: week.startDate,
                        endDate: week.endDate,
                        topics: week.topics,
                        goal: week.goal,
                        status: week.status,
                        tasks: {
                            // Type validation: ensure tasks is an array before calling .map
                            create: Array.isArray(week.tasks) ? week.tasks.map((task: any) => ({
                                dayNumber: task.dayNumber || task.day,
                                type: task.type,
                                description: task.description,
                                durationMinutes: task.durationMinutes,
                                isCompleted: false
                            })) : []
                        }
                    }))
                }
            },
            include: {
                weeks: {
                    include: { tasks: true }
                }
            }
        });

        res.json(result);
    } catch (error) {
        console.error("Create Plan Error:", error);
        res.status(500).json({ error: "Failed to create study plan" });
    }
};

export const getStudyPlans = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;
        const where: any = { profileId: req.user?.id };
        if (courseId) where.courseId = String(courseId);

        const plans = await prisma.studyPlan.findMany({
            where,
            include: { weeks: { include: { tasks: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch plans" });
    }
}

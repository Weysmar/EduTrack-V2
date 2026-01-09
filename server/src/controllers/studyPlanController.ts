import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request<any, any, any, any> {
    user?: { id: string, profileId: string };
}

// POST /api/study-plans
export const createStudyPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, title, goal, deadline, hoursPerWeek, weeks } = req.body;
        const profileId = req.user?.id;

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
                            create: week.tasks.map((task: any) => ({
                                dayNumber: task.dayNumber || task.day,
                                type: task.type,
                                description: task.description,
                                durationMinutes: task.durationMinutes,
                                isCompleted: false
                            }))
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

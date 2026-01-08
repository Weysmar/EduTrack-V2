import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: { id: string };
    headers: {
        'x-gemini-api-key'?: string;
        'x-perplexity-api-key'?: string;
        [key: string]: any;
    };
}

export const generatePlan = async (req: AuthRequest, res: Response) => {
    try {
        const { targetId, targetType, examDate, availableTime, timeUnit, apiKey: bodyApiKey } = req.body;
        const apiKey = (req.headers['x-gemini-api-key'] as string) || bodyApiKey;

        if (!targetId || !examDate || !availableTime) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        // 1. Fetch Course/Folder Content
        let items: any[] = [];
        let contextTitle = "";

        if (targetType === 'course') {
            const course = await prisma.course.findUnique({
                where: { id: targetId },
                include: { items: true }
            });
            if (!course) return res.status(404).json({ message: 'Course not found' });
            items = course.items;
            contextTitle = course.title;
        } else if (targetType === 'folder') {
            // Fetch folder and subcontent logic... simplified for now: assume items have folderId
            // Actually items don't have folderId directly usually, they are linked to course.
            // If target is folder, we need to find all courses in that folder and then all items.
            const folder = await prisma.folder.findUnique({
                where: { id: targetId },
                include: { courses: { include: { items: true } } }
            });
            if (!folder) return res.status(404).json({ message: 'Folder not found' });
            contextTitle = folder.name;
            items = folder.courses.flatMap(c => c.items);
        }

        if (items.length === 0) {
            return res.status(400).json({ message: 'No content found to study in this target.' });
        }

        // 2. Prepare Data for AI
        const contentSummary = items.map(i => ({
            id: i.id,
            title: i.title,
            type: i.type,
            difficulty: i.difficulty,
            status: i.status
        }));

        const systemPrompt = `You are an expert study coach. Create a revision schedule.
        Output MUST be valid JSON with this structure:
        {
          "program": {
            "examDate": string (ISO),
            "totalHours": number,
            "sessions": [
              {
                "day": number,
                "date": string (YYYY-MM-DD),
                "tasks": [
                  { "type": "read"|"practice"|"review", "itemId": string (optional), "title": string, "duration": number (minutes), "priority": "high"|"medium"|"low" }
                ]
              }
            ]
          }
        }`;

        const userPrompt = `
        Context: Preparing for exam on "${contextTitle}".
        Exam Date: ${examDate}
        Available Time: ${availableTime} ${timeUnit}
        Content to study:
        ${JSON.stringify(contentSummary)}

        Generate a balanced study plan fitting the available time before the exam.
        Focus on "practice" for items marked "hard", and "review" for items marked "completed".
        `;

        // 3. Call AI
        const plan = await aiService.generateJSON(userPrompt, systemPrompt, 'gemini-1.5-flash', apiKey);

        res.json(plan);

    } catch (error: any) {
        console.error('Plan Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate plan', error: error.message });
    }
};

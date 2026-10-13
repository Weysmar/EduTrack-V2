import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { incrementAIGeneration } from './profileController';

import { prisma } from '../lib/prisma';
import { DEFAULT_MODELS, isAIProvider, AIProvider } from '../config/aiModels';

interface AuthRequest extends Request {
    user?: { id: string };
    headers: {
        'x-ai-api-key'?: string;
        'x-gemini-api-key'?: string;
        'x-perplexity-api-key'?: string;
        [key: string]: any;
    };
}

export const generatePlan = async (req: AuthRequest, res: Response) => {
    try {
        const { targetId, targetType, examDate, availableTime, timeUnit, hoursPerDay, daysPerWeek, apiKey: bodyApiKey } = req.body;
        const provider: AIProvider = isAIProvider(req.body.provider) ? req.body.provider : 'google';

        // x-ai-api-key : en-tête unique (tous providers) ; les en-têtes historiques restent acceptés
        const legacyHeaderKey = provider === 'perplexity' ? req.headers['x-perplexity-api-key'] : provider === 'google' ? req.headers['x-gemini-api-key'] : undefined;
        const apiKey = (req.headers['x-ai-api-key'] as string) || (legacyHeaderKey as string) || bodyApiKey;

        const profileId = req.user?.id;
        if (!profileId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log(`[Planning] Generating plan for ${targetType} ${targetId}. Provider: ${provider}`);

        if (!targetId || !examDate) {
            return res.status(400).json({ message: 'Missing required parameters (targetId, examDate)' });
        }

        // Logic for time: Support both old (availableTime) and new (sliders)
        let timeContext = "";
        if (hoursPerDay && daysPerWeek) {
            timeContext = `${hoursPerDay} hours per day, ${daysPerWeek} days per week`;
        } else if (availableTime) {
            timeContext = `${availableTime} ${timeUnit}`;
        } else {
            // Fallback default
            timeContext = "10 hours total";
        }

        // 1. Fetch Course/Folder Content
        let items: any[] = [];
        let contextTitle = "";

        // Sécurité : uniquement les cours/dossiers de l'utilisateur connecté (404 sinon, sans révéler leur existence)
        if (targetType === 'course') {
            const course = await prisma.course.findFirst({
                where: { id: targetId, profileId },
                include: { items: true }
            });
            if (!course) return res.status(404).json({ message: 'Course not found' });
            items = course.items;
            contextTitle = course.title;
        } else if (targetType === 'folder') {
            const folder = await prisma.folder.findFirst({
                where: { id: targetId, profileId },
                include: { courses: { where: { profileId }, include: { items: true } } }
            });
            if (!folder) return res.status(404).json({ message: 'Folder not found' });
            contextTitle = folder.name;
            items = folder.courses.flatMap(c => c.items);
        } else {
            return res.status(400).json({ message: 'Invalid targetType (expected "course" or "folder")' });
        }

        console.log(`[Planning] Found ${items.length} items to include in plan context.`);

        if (items.length === 0) {
            return res.status(400).json({ message: 'No content found to study in this target.' });
        }

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
        Schedule Constraints: ${timeContext}
        Content to study:
        ${JSON.stringify(contentSummary)}

        Generate a balanced study plan fitting the schedule constraints before the exam.
        Focus on "practice" for items marked "hard", and "review" for items marked "completed".
        `;

        // 3. Call AI
        console.log(`[Planning] Calling AI service (${provider})...`);
        const model = DEFAULT_MODELS[provider];

        const plan = await aiService.generateJSON(userPrompt, systemPrompt, model, apiKey, provider);
        console.log(`[Planning] Plan successfully generated by AI.`);

        // Increment AI counter for plan generation
        if (req.user?.id) {
            await incrementAIGeneration(req.user.id);
        }

        res.json(plan);

    } catch (error: any) {
        console.error('[Planning] Fatal Error:', error);
        res.status(500).json({
            message: 'Failed to generate plan',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

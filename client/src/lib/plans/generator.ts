import { generateWithPerplexity } from '@/lib/ai/perplexity'
import { studyPlanQueries, itemQueries, courseQueries } from '@/lib/api/queries'

interface PlanGenerationParams {
    courseId: string;
    profileId: string;
    deadline: Date;
    hoursPerWeek: number;
    goal: string;
    preferences: {
        flashcardsRatio: number; // 0-1
        quizRatio: number;
        readingRatio: number;
    };
    notes?: string;
}

export async function generateStudyPlan(params: PlanGenerationParams) {
    // 1. Fetch course context via API
    // Need queries to support getOne course and getItemsByCourse
    const course = await courseQueries.getOne(params.courseId)
    if (!course) throw new Error("Course not found")

    // itemQueries.getByCourse usually returns items
    const items = await itemQueries.getByCourse(params.courseId)
    // Map items to context string
    const context = items.map((i: any) => `${i.type.toUpperCase()}: ${i.title}\n${i.content?.substring(0, 200)}...`).join('\n\n')

    // 2. Prepare Prompt
    const weeksUntilDeadline = Math.max(1, Math.floor((params.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)))

    const prompt = `
        Act as an expert study planner. Create a detailed, intelligent study plan for a course titled "${course.title}".
        
        CONTEXT:
        ${context.substring(0, 3000)}

        PARAMETERS:
        - Deadline: ${params.deadline.toISOString()} (${weeksUntilDeadline} weeks remaining)
        - Availability: ${params.hoursPerWeek} hours/week
        - Goal: ${params.goal}
        - Strategy: ${Math.round(params.preferences.flashcardsRatio * 100)}% Flashcards, ${Math.round(params.preferences.quizRatio * 100)}% Quizzes, ${Math.round(params.preferences.readingRatio * 100)}% Reading.

        OUTPUT REQUIREMENTS:
        - Return ONLY a JSON object. No markdown, no text before/after.
        - Structure:
        {
            "weeks": [
                {
                    "weekNumber": 1,
                    "topics": ["Topic A", "Topic B"],
                    "goal": "Understand basics",
                    "tasks": [
                         { "day": 1, "type": "reading", "description": "Read intro...", "durationMinutes": 60 },
                         { "day": 2, "type": "flashcards", "description": "Review terms...", "durationMinutes": 30 }
                    ]
                }
            ]
        }
        - Plan for exactly ${weeksUntilDeadline} weeks.
        - Distribute tasks to fit ${params.hoursPerWeek} hours/week.
    `

    // 3. Call AI
    const response = await generateWithPerplexity(prompt)
    let planData: any
    try {
        // Clean cleanup if MD is returned
        const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim()
        planData = JSON.parse(jsonStr)
    } catch (e) {
        console.error("Failed to parse AI plan", response)
        throw new Error("Failed to generate plan structure")
    }

    // 4. Save to API
    const payload = {
        courseId: params.courseId,
        title: `Plan: ${course.title}`,
        goal: params.goal,
        deadline: params.deadline,
        hoursPerWeek: params.hoursPerWeek,
        weeks: planData.weeks.map((week: any) => {
            // Calculate Dates based on current date + week offset
            // We can do this simple approach or let backend handle it.
            // But we need to define 'startDate' for the week.
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() + ((week.weekNumber - 1) * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            return {
                weekNumber: week.weekNumber,
                startDate: weekStart,
                endDate: weekEnd, // required by schema?
                topics: week.topics || [],
                goal: week.goal,
                status: week.weekNumber === 1 ? 'current' : 'locked',
                tasks: week.tasks.map((t: any) => ({
                    day: t.day,
                    type: t.type,
                    description: t.description,
                    durationMinutes: t.durationMinutes
                }))
            }
        })
    };

    return await studyPlanQueries.create(payload);
}

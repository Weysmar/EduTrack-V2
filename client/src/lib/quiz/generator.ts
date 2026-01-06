import { QuizQuestion } from '@/lib/types';
import { AIServiceFactory } from '@/lib/ai/factory';

export interface QuizGenerationParams {
    content: string;
    count: number;
    difficulty: 'easy' | 'normal' | 'hard' | 'mixed';
    types: ('concept' | 'fact' | 'application' | 'calculation')[];
    topics?: string[];
    provider: 'google' | 'perplexity';
    model?: string;
}

const SYSTEM_PROMPT = `
You are an expert educational content creator specializing in Multiple Choice Questions (MCW/QCM).
Generate high-quality QCM based on the provided content.

STRICT RULES:
1. QUESTION STEM:
   - Clear, unambiguous, 1-3 sentences.
   - No double negatives.
   - Must have EXACTLY ONE correct answer.

2. OPTIONS:
   - Provide exactly 4 options (A, B, C, D).
   - 1 Correct Answer.
   - 3 Plausible Distractors (common misconceptions).
   - "correctAnswer" in JSON must be the INDEX (0, 1, 2, or 3).

3. EXPLANATION:
   - Explain WHY the correct answer is right.
   - Explain WHY distractors are wrong.
   - Concise (2-3 sentences).

4. OUTPUT FORMAT (JSON ONLY):
   {
     "questions": [
       {
         "stem": "Question text?",
         "options": ["Option A", "Option B", "Option C", "Option D"],
         "correctAnswer": 0,
         "explanation": "Detailed explanation...",
         "difficulty": "easy|normal|hard",
         "type": "concept|fact|application|calculation",
         "tags": ["#tag1"]
       }
     ]
   }
`;

export async function generateQuizQuestions(params: QuizGenerationParams): Promise<Partial<QuizQuestion>[]> {
    const { content, count, difficulty, types, topics } = params;

    const userPrompt = `
    CONTENT:
    ${content.substring(0, 15000)} ...

    PARAMETERS:
    Number of Questions: ${count}
    Difficulty: ${difficulty}
    Types: ${types.join(', ')}
    Topics: ${topics?.join(', ') || 'All relevant topics'}

    Generate the QCM JSON now.
    `;

    try {
        const textOutput = await AIServiceFactory.generateGeneric(userPrompt, SYSTEM_PROMPT, params.provider, params.model);

        // Parse JSON
        const jsonStart = textOutput.indexOf('{');
        const jsonEnd = textOutput.lastIndexOf('}');
        const jsonString = textOutput.substring(jsonStart, jsonEnd + 1);

        const parsed = JSON.parse(jsonString);

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid format received from AI");
        }

        // Shuffle options and update correctAnswer
        const shuffledQuestions = parsed.questions.map((q: any) => {
            if (!q.options || q.correctAnswer === undefined) return q;

            // Create pairs of [option, originalIndex]
            const optionsWithIndex = q.options.map((opt: string, idx: number) => ({ opt, originalIdx: idx }));

            // Shuffle
            for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
            }

            // Map back
            const newOptions = optionsWithIndex.map((o: any) => o.opt);
            const newCorrectAnswer = optionsWithIndex.findIndex((o: any) => o.originalIdx === q.correctAnswer);

            return {
                ...q,
                options: newOptions,
                correctAnswer: newCorrectAnswer
            };
        });

        return shuffledQuestions;

    } catch (error) {
        console.error("Quiz generation failed:", error);
        throw error;
    }
}

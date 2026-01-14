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
Tu es un expert pédagogique spécialisé dans la création de QCM (Questionnaires à Choix Multiples).
Génère des QCM de haute qualité basés sur le contenu fourni, EN FRANÇAIS.

RÈGLES STRICTES:
1. ÉNONCÉ (STEM):
   - Clair, non ambigu, 1-3 phrases.
   - Pas de double négation.
   - Doit avoir EXACTEMENT UNE seule bonne réponse.

2. OPTIONS:
   - Fournir exactement 4 options (A, B, C, D).
   - 1 Bonne réponse.
   - 3 Distracteurs plausibles (idées reçues courantes).
   - "correctAnswer" dans le JSON doit être l'INDEX (0, 1, 2, ou 3).

3. EXPLICATION:
   - Expliquer POURQUOI la bonne réponse est correcte.
   - Expliquer POURQUOI les distracteurs sont faux.
   - Concis (2-3 phrases).

4. FORMAT DE SORTIE (JSON UNIQUEMENT):
   {
     "questions": [
       {
         "stem": "Texte de la question ?",
         "options": ["Option A", "Option B", "Option C", "Option D"],
         "correctAnswer": 0,
         "explanation": "Explication détaillée...",
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
    CONTENU:
    ${content.substring(0, 15000)} ...

    PARAMÈTRES:
    Nombre de questions: ${count}
    Difficulté: ${difficulty}
    Types: ${types.join(', ')}
    Sujets: ${topics?.join(', ') || 'Tous les sujets pertinents'}

    Générez le QCM en format JSON strictement en Français.
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

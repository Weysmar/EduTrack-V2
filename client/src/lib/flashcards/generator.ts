import { Flashcard } from '@/lib/types';
import { AIServiceFactory } from '@/lib/ai/factory';

export interface GenerationParams {
  content: string;
  count: number;
  difficulty: 'easy' | 'normal' | 'hard' | 'mixed';
  types: ('facts' | 'concepts' | 'calculations' | 'applications')[];
  provider: 'google' | 'perplexity';
  model?: string;
}

const SYSTEM_PROMPT = `
Tu es expert en création de flashcards pédagogiques pour spaced repetition.
Génère des flashcards de haute qualité basées sur le contenu fourni.

RÈGLES STRICTES:
1. QUALITÉ Q&A: Questions claires (1-2 phrases), Réponses structurées mais concises.
2. FORMAT OUTPUT JSON:
   {
     "flashcards": [
       {
         "front": "Question?",
         "back": "Réponse détaillée.",
         "difficulty": "easy|normal|hard",
         "tags": ["#tag1", "#tag2"]
       }
     ]
   }
3. Pas de bla-bla, uniquement le JSON.
`;

export async function generateFlashcards(params: GenerationParams): Promise<Partial<Flashcard>[]> {
  const { content, count, difficulty, types } = params;

  const userPrompt = `
    CONTENU ORIGINAL:
    ${content.substring(0, 15000)} ... (truncated if too long)

    PARAMÈTRES:
    Nombre de cartes: ${count}
    Difficulté cible: ${difficulty}
    Types: ${types.join(', ')}

    Génère le JSON maintenant.
    `;



  try {
    const textOutput = await AIServiceFactory.generateGeneric(userPrompt, SYSTEM_PROMPT, params.provider, params.model);

    // Parse JSON from text (handle algorithm blocks if present)
    const jsonStart = textOutput.indexOf('{');
    const jsonEnd = textOutput.lastIndexOf('}');
    const jsonString = textOutput.substring(jsonStart, jsonEnd + 1);

    const parsed = JSON.parse(jsonString);

    if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
      throw new Error("Invalid format received from AI");
    }

    return parsed.flashcards;

  } catch (error) {
    console.error("Flashcard generation failed:", error);
    throw error;
  }
}

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
Tu es un expert pédagogique de premier plan dans la création de flashcards pour la répétition espacée (Spaced Repetition / Anki).
Génère des flashcards captivantes, de très haute qualité et parfaitement structurées basées sur le contenu fourni, EN FRANÇAIS.

RÈGLES STRICTES DE MISE EN FORME ET PÉDAGOGIE :
1. CLARTÉ & STRUCTURE :
   - Recto (front) : Question ciblée, stimulante et non ambiguë (1-2 phrases).
   - Verso (back) : Réponse claire, synthétique et aérée (évite les blocs compacts illisibles).
2. MISE EN VALEUR ET AÉRATION (MARKDOWN) :
   - Mets les concepts clés, lois ou termes indispensables en gras avec **terme important**.
   - Si la réponse contient plusieurs points, étapes ou principes : SAUTE TOUJOURS UNE LIGNE entre chaque point avec des retours à la ligne explicites (\n\n1. **Point 1** : détail\n\n2. **Point 2** : détail).
   - Ne colle JAMAIS plusieurs points numérotés sur la même ligne.
3. FORMAT OUTPUT JSON STRICT (uniquement du JSON valide, sans texte additionnel) :
   {
     "flashcards": [
       {
         "front": "Question ?",
         "back": "Réponse bien aérée.",
         "difficulty": "easy|normal|hard",
         "tags": ["#notion"]
       }
     ]
   }
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

    // Clean markdown code fences if present
    let cleanText = textOutput.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    const jsonString = (jsonStart !== -1 && jsonEnd !== -1) ? cleanText.substring(jsonStart, jsonEnd + 1) : cleanText;

    const parsed = JSON.parse(jsonString);
    const cards = parsed.flashcards || parsed.cards || (Array.isArray(parsed) ? parsed : null);

    if (!cards || !Array.isArray(cards)) {
      throw new Error("Format JSON invalide reçu de l'IA (aucune flashcard trouvée)");
    }

    return cards;

  } catch (error) {
    console.error("Flashcard generation failed:", error);
    throw error;
  }
}

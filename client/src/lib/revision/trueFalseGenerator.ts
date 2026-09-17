import { QuizQuestion } from '@/lib/types';
import { AIServiceFactory } from '@/lib/ai/factory';

export interface TrueFalseGenerationParams {
    content: string;
    sourceTitle?: string;
    count: number;
    difficulty?: 'easy' | 'normal' | 'hard' | 'mixed';
    provider: 'google' | 'perplexity';
    model?: string;
}

const SYSTEM_PROMPT = `
Tu es un expert pédagogique de référence dans la conception de questions d'examen VRAI / FAUX à fort impact cognitif.
À partir du cours fourni, génère une série de questions binaires VRAI / FAUX stimulantes, rigoureuses et équilibrées, EN FRANÇAIS.

RÈGLES D'OR :
1. ÉNONCÉ (STEM) :
   - Affirmation claire, directe et sans ambiguïté grammaticale (1 à 2 phrases).
   - Tester la compréhension profonde, les nuances et les pièges classiques plutôt que la récitation passive.
   - Éviter les double négations déroutantes.
2. ÉQUILIBRE :
   - Environ 50% d'affirmations VRAIES et 50% d'affirmations FAUSSES.
   - Les affirmations fausses doivent être plausibles (contenir un piège subtil ou une idée reçue fréquente).
3. EXPLICATION DÉTAILLÉE :
   - Commencer par "C'est VRAI car..." ou "C'est FAUX : en réalité...".
   - Expliquer pourquoi l'affirmation est vraie ou fausse avec la règle exacte.
4. OPTIONS ET RÉPONSE :
   - Les options DOIVENT être exactement : ["Vrai", "Faux"]
   - correctAnswer = 0 si l'affirmation est VRAIE
   - correctAnswer = 1 si l'affirmation est FAUSSE

FORMAT DE SORTIE (JSON STRICT SANS AUCUN TEXTE AUTOUR) :
{
  "questions": [
    {
      "stem": "En comptabilité générale, une charge diminue toujours le résultat de l'exercice.",
      "options": ["Vrai", "Faux"],
      "correctAnswer": 0,
      "explanation": "C'est VRAI : les charges constituent des emplois définitifs qui viennent en déduction des produits pour former le résultat net.",
      "difficulty": "normal",
      "concept": "Résultat comptable"
    },
    {
      "stem": "Le protocole HTTP chiffre nativement les échanges entre le client et le serveur.",
      "options": ["Vrai", "Faux"],
      "correctAnswer": 1,
      "explanation": "C'est FAUX : le protocole HTTP transmet les données en clair. C'est HTTPS (HTTP over TLS/SSL) qui assure le chiffrement et l'intégrité des échanges.",
      "difficulty": "easy",
      "concept": "Protocoles réseaux"
    }
  ]
}
`;

export async function generateTrueFalseQuestions(params: TrueFalseGenerationParams): Promise<Partial<QuizQuestion>[]> {
    const { content, sourceTitle, count, difficulty = 'mixed' } = params;

    const userPrompt = `
CONTENU DU COURS :
${content.substring(0, 18000)} ...

SOURCE / TITRE :
${sourceTitle || 'Cours'}

PARAMÈTRES :
Nombre d'affirmations Vrai/Faux : ${count}
Difficulté : ${difficulty}

Génère les questions Vrai/Faux en format JSON strict en français.
`;

    const rawOutput = await AIServiceFactory.generateGeneric(userPrompt, SYSTEM_PROMPT, params.provider, params.model);

    let cleanText = rawOutput.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    const jsonStr = (startIdx !== -1 && endIdx !== -1) ? cleanText.substring(startIdx, endIdx + 1) : cleanText;

    const parsed = JSON.parse(jsonStr);
    const questions = parsed.questions || (Array.isArray(parsed) ? parsed : null);

    if (!questions || !Array.isArray(questions)) {
        throw new Error("Format JSON invalide reçu de l'IA (aucune question Vrai/Faux trouvée)");
    }

    return questions.map((q: any) => ({
        stem: q.stem || '?',
        options: ['Vrai', 'Faux'],
        correctAnswer: q.correctAnswer === 1 ? 1 : 0,
        explanation: q.explanation || '',
        difficulty: q.difficulty || difficulty
    }));
}

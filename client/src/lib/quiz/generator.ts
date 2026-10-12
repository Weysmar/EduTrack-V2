import { QuizQuestion } from '@/lib/types';
import { AIServiceFactory } from '@/lib/ai/factory';
import { outputLanguageInstruction, outputLanguageName, truncateContent, type OutputLanguage } from '@/lib/ai/language';

export interface QuizGenerationParams {
    content: string;
    count: number;
    difficulty: 'easy' | 'normal' | 'hard' | 'mixed';
    types: ('concept' | 'fact' | 'application' | 'calculation')[];
    topics?: string[];
    provider: 'google' | 'perplexity';
    model?: string;
    /** Langue du contenu généré (langue de l'interface). Défaut : 'fr' */
    language?: OutputLanguage;
    /** Signal d'annulation (AbortController) */
    signal?: AbortSignal;
}

/** Nombre max de caractères du contenu source envoyés à l'IA */
export const QUIZ_MAX_CHARS = 15000;

const SYSTEM_PROMPT = `
Tu es un expert pédagogique de premier plan dans la conception de QCM (Questionnaires à Choix Multiples) d'excellence universitaire.
Génère des QCM captivants, rigoureux et impeccablement rédigés basés sur le contenu fourni, EN FRANÇAIS.

RÈGLES STRICTES DE STRUCTURE ET FORMAT :
1. ÉNONCÉ (STEM) :
   - Clair, précis, stimulant, 1 à 2 phrases.
   - Utilise le gras (**concept**) pour faire ressortir les mots-clés de la question si utile.
   - Aucune ambiguïté ni double négation.
   - EXACTEMENT UNE seule bonne réponse possible.

2. OPTIONS (4 CHOIX ÉQUILIBRÉS) :
   - Fournir exactement 4 options réalistes, crédibles et de longueur équilibrée.
   - NE PAS ajouter de préfixe comme "A.", "B.", "1.", "a)" dans le texte des options (l'interface affiche automatiquement les badges de sélection A, B, C, D).
   - "correctAnswer" dans le JSON DOIT être l'index entier (0, 1, 2 ou 3) de la bonne réponse dans le tableau "options".

3. EXPLICATION DÉTAILLÉE :
   - Pédagogique et valorisante (2 à 3 phrases).
   - Expliquer pourquoi la bonne réponse est exacte en mettant en valeur l'argument clé (**explication clé**).
   - Préciser succinctement pourquoi les autres alternatives sont erronées.

4. FORMAT DE SORTIE (JSON STRICT SANS AUCUN COMMENTAIRE EXTERNE) :
   {
     "questions": [
       {
         "stem": "Texte de la question ?",
         "options": [
           "Première alternative",
           "Deuxième alternative",
           "Troisième alternative",
           "Quatrième alternative"
         ],
         "correctAnswer": 0,
         "explanation": "Explication claire...",
         "difficulty": "easy|normal|hard",
         "type": "concept|fact|application|calculation",
         "tags": ["#notion"]
       }
     ]
   }
`;

const buildSystemPrompt = (lang: OutputLanguage = 'fr'): string =>
    SYSTEM_PROMPT.replace('EN FRANÇAIS', outputLanguageName(lang)) + outputLanguageInstruction(lang);

export async function generateQuizQuestions(params: QuizGenerationParams): Promise<Partial<QuizQuestion>[]> {
    const { content, count, difficulty, types, topics, language = 'fr' } = params;
    const source = truncateContent(content, QUIZ_MAX_CHARS);

    const userPrompt = `
    CONTENU:
    ${source.text}${source.truncated ? ' ... (contenu tronqué)' : ''}

    PARAMÈTRES:
    Nombre de questions: ${count}
    Difficulté: ${difficulty}
    Types: ${types.join(', ')}
    Sujets: ${topics?.join(', ') || 'Tous les sujets pertinents'}

    Générez le QCM en format JSON strict, ${language === 'en' ? 'rédigé en anglais' : 'rédigé en français'}.
    `;

    try {
        const textOutput = await AIServiceFactory.generateGeneric(userPrompt, buildSystemPrompt(language), params.provider, params.model, { signal: params.signal });

        // Clean markdown code fences if present
        let cleanText = textOutput.trim();
        if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        const jsonString = (jsonStart !== -1 && jsonEnd !== -1) ? cleanText.substring(jsonStart, jsonEnd + 1) : cleanText;

        const parsed = JSON.parse(jsonString);
        const questions = parsed.questions || (Array.isArray(parsed) ? parsed : null);

        if (!questions || !Array.isArray(questions)) {
            throw new Error("Format JSON invalide reçu de l'IA (aucune question trouvée)");
        }

        // Shuffle options and update correctAnswer
        const shuffledQuestions = questions.map((q: any) => {
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

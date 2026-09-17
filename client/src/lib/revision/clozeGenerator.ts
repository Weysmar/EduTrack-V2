import { AIServiceFactory } from '@/lib/ai/factory';

export interface ClozeBlank {
    index: number;
    answer: string;
    hint?: string;
    acceptableAlternatives?: string[];
}

export interface ClozeItem {
    id: string;
    title: string;
    instruction: string;
    textWithBlanks: string; // Ex: "Le protocole [blank:0] permet de sécuriser les échanges grâce au chiffrement [blank:1]."
    blanks: ClozeBlank[];
    wordBank: string[]; // Correct answers + clever distractors (shuffled)
    explanation: string;
}

export interface ClozeExerciseData {
    title: string;
    courseName?: string;
    difficulty: 'easy' | 'normal' | 'hard' | 'mixed';
    exercises: ClozeItem[];
}

export interface ClozeGenerationParams {
    content: string;
    sourceTitle?: string;
    count?: number; // Number of paragraphs / exercises (default 3)
    difficulty?: 'easy' | 'normal' | 'hard' | 'mixed';
    provider: 'google' | 'perplexity';
    model?: string;
}

const SYSTEM_PROMPT = `
Tu es un expert pédagogique international dans la conception d'exercices à trous (textes lacunaires / Cloze tests) pour l'apprentissage actif (Active Recall).
À partir du contenu de cours fourni, génère des exercices à trous captivants, rigoureux et hautement formateurs EN FRANÇAIS.

RÈGLES D'OR DE CONCEPTION :
1. PARAGRAPHES FLUIDES : Rédige des paragraphes complets, bien écrits et riches en enseignements (3 à 6 phrases par paragraphe).
2. SÉLECTION DES TROUS :
   - Masque UNIQUEMENT les notions clés, termes techniques, mécanismes cruciaux, dates ou principes fondamentaux (NE PAS masquer des mots de liaison sans intérêt comme "le", "et", "dans").
   - 3 à 5 trous maximum par paragraphe pour préserver la lisibilité et le sens.
   - Les trous DOIVENT être balisés dans le texte exactement sous la forme : [blank:0], [blank:1], [blank:2]...
3. BANQUE DE MOTS (WORD BANK) :
   - Fournis toutes les bonnes réponses des trous du paragraphe, PLUS 2 ou 3 distracteurs crédibles et pertinents (termes du même domaine) pour donner du challenge en mode QCM/Banque.
4. INDICES PÉDAGOGIQUES :
   - Pour chaque trou, un indice court mais éclairant (ex: "Protocole sécurisé", "Unité de mesure...", "Principe comptable...").
5. ALTERNATIVES ACCEPTABLES :
   - Prévoir d'éventuelles variantes courantes (singulier/pluriel, majuscules, acronymes).

FORMAT DE SORTIE (JSON STRICT SANS COMMENTAIRE) :
{
  "title": "Titre global du jeu d'exercices",
  "difficulty": "easy|normal|hard|mixed",
  "exercises": [
    {
      "id": "ex-1",
      "title": "Titre du thème ou sous-partie",
      "instruction": "Complétez le texte en sélectionnant ou tapant les termes appropriés.",
      "textWithBlanks": "En réseau, le protocole [blank:0] garantit la confidentialité des échanges grâce au protocole cryptographique [blank:1].",
      "blanks": [
        {
          "index": 0,
          "answer": "HTTPS",
          "hint": "Protocole web sécurisé",
          "acceptableAlternatives": ["https", "HyperText Transfer Protocol Secure"]
        },
        {
          "index": 1,
          "answer": "TLS",
          "hint": "Successeur de SSL",
          "acceptableAlternatives": ["tls", "SSL/TLS"]
        }
      ],
      "wordBank": ["HTTPS", "TLS", "HTTP", "FTP", "SSH"],
      "explanation": "HTTPS utilise TLS pour sécuriser le trafic web, protégeant ainsi l'intégrité et la confidentialité des données transmises."
    }
  ]
}
`;

export async function generateClozeExercises(params: ClozeGenerationParams): Promise<ClozeExerciseData> {
    const { content, sourceTitle, count = 3, difficulty = 'normal' } = params;

    const userPrompt = `
CONTENU DU COURS :
${content.substring(0, 18000)} ...

SOURCE / TITRE :
${sourceTitle || 'Cours'}

PARAMÈTRES :
Nombre d'exercices / paragraphes : ${count}
Niveau de difficulté : ${difficulty}

Génère la série d'exercices à trous au format JSON strict en français.
`;

    const rawOutput = await AIServiceFactory.generateGeneric(userPrompt, SYSTEM_PROMPT, params.provider, params.model);

    // Clean wrappers
    let cleanText = rawOutput.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    const jsonStr = (startIdx !== -1 && endIdx !== -1) ? cleanText.substring(startIdx, endIdx + 1) : cleanText;

    const data: ClozeExerciseData = JSON.parse(jsonStr);

    // Ensure wordBank is shuffled for each exercise
    if (data.exercises && Array.isArray(data.exercises)) {
        data.exercises = data.exercises.map((ex, i) => {
            const exerciseId = ex.id || `ex-${i + 1}`;
            let bank = [...(ex.wordBank || [])];
            // If wordBank is missing blanks, add them
            ex.blanks?.forEach(b => {
                if (!bank.includes(b.answer)) bank.push(b.answer);
            });
            // Shuffle
            for (let j = bank.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [bank[j], bank[k]] = [bank[k], bank[j]];
            }
            return {
                ...ex,
                id: exerciseId,
                wordBank: bank
            };
        });
    }

    return data;
}

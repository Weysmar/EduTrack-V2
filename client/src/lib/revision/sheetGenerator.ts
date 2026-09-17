import { AIServiceFactory } from '@/lib/ai/factory';

export interface RevisionKeyConcept {
    term: string;
    definition: string;
    importance: 'critical' | 'important' | 'bonus';
}

export interface RevisionRuleOrFormula {
    label: string;
    ruleOrFormula: string;
    explanation: string;
}

export interface RevisionExamTrap {
    trap: string;
    explanation: string;
    correctApproach: string;
}

export interface RevisionMnemonic {
    title: string;
    trick: string;
    explanation: string;
}

export interface RevisionSheetData {
    title: string;
    overview: string;
    keyConcepts: RevisionKeyConcept[];
    rulesAndFormulas: RevisionRuleOrFormula[];
    examTraps: RevisionExamTrap[];
    mnemonics: RevisionMnemonic[];
    masteryChecklist: string[];
    markdown?: string;
}

export interface RevisionSheetParams {
    content: string;
    sourceTitle?: string;
    difficulty?: 'easy' | 'normal' | 'hard' | 'mixed';
    focus?: string[];
    provider: 'google' | 'perplexity';
    model?: string;
}

const SYSTEM_PROMPT = `
Tu es un professeur agrégé et un expert pédagogique d'élite.
Ta mission est de créer une FICHE DE RÉVISION d'excellence universitaire, ultra-condensée, mémorisable et redoutablement efficace pour réussir les examens, EN FRANÇAIS.

RÈGLES PÉDAGOGIQUES :
1. VUE D'ENSEMBLE : 2 à 3 phrases percutantes qui résument l'essence même du sujet.
2. DÉFINITIONS CLÉS (5 à 8 termes incontournables) :
   - Terme précis
   - Définition concise (1-2 phrases sans jargon inutile)
   - Niveau d'importance ("critical" = tombe à chaque examen, "important" = fondamental, "bonus" = fait la différence pour avoir 20/20)
3. FORMULES, LOIS OU RÈGLES CLÉS (3 à 6 éléments) :
   - Intitulé clair
   - Formule ou règle énoncée nettement
   - Courte explication concrète
4. PIÈGES D'EXAMEN & ERREURS FRÉQUENTES (3 à 5 pièges classiques) :
   - Le piège typique dans lequel tombent les étudiants
   - Pourquoi l'erreur est commise
   - La bonne démarche à adopter le jour J
5. MOYENS MNÉMOTECHNIQUES & ASTUCES MÉMO (2 à 4 astuces) :
   - Acronymes, analogies parlantes ou astuces visuelles pour mémoriser sans effort
6. CHECKLIST DE MAÎTRISE (5 à 8 compétences concrètes) :
   - Des affirmations commençant par "Je sais...", "Je suis capable de...", "Je maîtrise la différence entre..."

FORMAT DE SORTIE (JSON STRICT SANS AUCUN TEXTE AVANT OU APRÈS) :
{
  "title": "Titre explicite de la fiche",
  "overview": "Synthèse en 2-3 phrases...",
  "keyConcepts": [
    {
      "term": "Concept",
      "definition": "Définition rigoureuse et claire...",
      "importance": "critical"
    }
  ],
  "rulesAndFormulas": [
    {
      "label": "Nom de la formule ou règle",
      "ruleOrFormula": "Énoncé ou équation...",
      "explanation": "Explication pédagogique..."
    }
  ],
  "examTraps": [
    {
      "trap": "Piège classique...",
      "explanation": "Pourquoi beaucoup d'étudiants se trompent...",
      "correctApproach": "La méthode infaillible..."
    }
  ],
  "mnemonics": [
    {
      "title": "Titre de l'astuce",
      "trick": "Phrase mémo ou acronyme...",
      "explanation": "Comment l'appliquer..."
    }
  ],
  "masteryChecklist": [
    "Je sais définir...",
    "Je sais expliquer le fonctionnement de..."
  ]
}
`;

export async function generateRevisionSheet(params: RevisionSheetParams): Promise<RevisionSheetData> {
    const { content, sourceTitle, difficulty = 'normal', focus } = params;

    const userPrompt = `
CONTENU DU COURS À CONDENSER EN FICHE DE RÉVISION :
${content.substring(0, 20000)} ...

TITRE / SOURCE :
${sourceTitle || 'Cours'}

PARAMÈTRES :
Difficulté ciblée : ${difficulty}
Axes d'attention prioritaires : ${focus && focus.length ? focus.join(', ') : 'Concepts fondamentaux, formules clés, pièges d\'examen'}

Génère la fiche de révision complète au format JSON strict en français.
`;

    const rawOutput = await AIServiceFactory.generateGeneric(userPrompt, SYSTEM_PROMPT, params.provider, params.model);

    // Clean markdown wrappers
    let cleanText = rawOutput.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    const jsonStr = (startIdx !== -1 && endIdx !== -1) ? cleanText.substring(startIdx, endIdx + 1) : cleanText;

    const data: RevisionSheetData = JSON.parse(jsonStr);

    // Build human-friendly Markdown fallback
    data.markdown = buildMarkdownFromSheet(data);

    return data;
}

function buildMarkdownFromSheet(sheet: RevisionSheetData): string {
    const lines: string[] = [];
    lines.push(`# 📋 Fiche de Révision : ${sheet.title}`);
    lines.push(`\n> **Vue d'ensemble** : ${sheet.overview}\n`);

    if (sheet.keyConcepts?.length) {
        lines.push('## 🔑 Définitions & Notions Clés');
        sheet.keyConcepts.forEach(c => {
            const badge = c.importance === 'critical' ? '🔴 *Crucial*' : c.importance === 'important' ? '🟡 *Important*' : '🟢 *Bonus*';
            lines.push(`- **${c.term}** (${badge}) : ${c.definition}`);
        });
        lines.push('');
    }

    if (sheet.rulesAndFormulas?.length) {
        lines.push('## 📐 Règles Fondamentales & Formules');
        sheet.rulesAndFormulas.forEach(r => {
            lines.push(`### ${r.label}`);
            lines.push(`> \`${r.ruleOrFormula}\``);
            lines.push(`${r.explanation}\n`);
        });
    }

    if (sheet.examTraps?.length) {
        lines.push('## ⚠️ Pièges d\'Examen à Éviter');
        sheet.examTraps.forEach(t => {
            lines.push(`- **Piège :** ${t.trap}`);
            lines.push(`  - *Pourquoi on se trompe :* ${t.explanation}`);
            lines.push(`  - *La bonne démarche :* ${t.correctApproach}`);
        });
        lines.push('');
    }

    if (sheet.mnemonics?.length) {
        lines.push('## 💡 Astuces Mémo & Mnémotechniques');
        sheet.mnemonics.forEach(m => {
            lines.push(`- **${m.title}** : *"${m.trick}"* — ${m.explanation}`);
        });
        lines.push('');
    }

    if (sheet.masteryChecklist?.length) {
        lines.push('## ✅ Checklist Avant l\'Examen');
        sheet.masteryChecklist.forEach(item => {
            lines.push(`- [ ] ${item}`);
        });
        lines.push('');
    }

    return lines.join('\n');
}

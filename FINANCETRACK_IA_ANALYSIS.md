# 🤖 Utilisation de l'IA et Clés API - FinanceTrack

**Document de synthèse - EduTrack V2**  
**Date :** 12 Mars 2026

---

## 📋 Vue d'Ensemble

FinanceTrack intègre l'Intelligence Artificielle via **Google Gemini** et **Perplexity AI** pour enrichir automatiquement les données financières. Les clés API sont gérées **par utilisateur** et stockées de manière sécurisée dans le profil utilisateur.

---

## 🔑 Architecture des Clés API

### 1. Stockage Frontend (Client)

**Emplacement :** `@/components/profile/ApiKeySettings.tsx`

Les clés API sont stockées dans le **Profile Store** (Zustand) et synchronisées avec la base de données via l'API :

```typescript
// Structure des clés dans le profil
interface ApiKeys {
  // Éducatif
  perplexity_summaries: string;      // Résumés via Perplexity
  perplexity_exercises: string;      // Exercices via Perplexity
  google_gemini_summaries: string;   // Résumés via Gemini
  google_gemini_exercises: string;   // Exercices via Gemini
  
  // Intégrations
  google_calendar: string;             // Token OAuth Calendar
  
  // === FINANCETRACK ===
  finance_audit_provider: 'google' | 'perplexity';
  finance_audit_model: string;         // ex: 'gemini-1.5-flash', 'sonar'
}
```

**UI Settings Page** (`SettingsPage.tsx` ligne 105-112) :
```tsx
{activeTab === 'api' && (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Configuration API</h2>
    <ApiKeySettings />  // ← Gestion des clés
  </div>
)}
```

**Interface de configuration** (section Finance) :
- **Provider** : Choix entre Google Gemini et Perplexity
- **Modèle** : Sélection du modèle selon le provider
  - Gemini : `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-2.0-pro`
  - Perplexity : `sonar`, `sonar-pro`, `sonar-reasoning`

### 2. Stockage Backend (Base de données)

**Schéma :** `Profile.settings` (champ JSON dans Prisma)

```prisma
// schema.prisma - ligne 11-41
model Profile {
  id           String   @id @default(uuid())
  name         String
  email        String?  @unique
  passwordHash String?
  settings     Json?    // ← CLÉS API STOCKÉES ICI
  aiGenerationsCount Int @default(0)
  // ... autres champs
}
```

Les clés sont récupérées via :
```typescript
const profile = await prisma.profile.findUnique({
  where: { id: profileId },
  select: { settings: true }
});

const apiKey = (profile?.settings as any)?.google_gemini_summaries;
```

### 3. Flux de Transmission

```
[Frontend - ApiKeySettings]
  │
  │ 1. Utilisateur saisit sa clé
  ▼
[Profile Store (Zustand)]
  │
  │ 2. updateApiKeys() → POST /api/profiles/api-keys
  ▼
[Backend - ProfileController]
  │
  │ 3. Stockage JSON dans Profile.settings
  ▼
[PostgreSQL]
  │
  │ 4. Récupération lors des appels IA
  ▼
[FinanceService / aiService]
  │
  │ 5. Appel API Gemini/Perplexity avec clé utilisateur
  ▼
[API Externe - Google/Perplexity]
```

---

## 🎯 Fonctionnalités IA dans FinanceTrack

### 1. Catégorisation Automatique des Transactions

**Endpoint :** `POST /api/finance/transactions/categorize`  
**Contrôleur :** `financeController.ts` (lignes 251-263)  
**Service :** `categorizerService.ts`

**Description :**
- L'utilisateur sélectionne des transactions non catégorisées
- L'IA analyse la description et le montant
- Attribution automatique d'une catégorie parmi : `Alimentation`, `Logement`, `Transport`, `Loisirs`, `Santé`, `Shopping`, `Services`, `Restaurants`, `Salaires`, `Virements`, `Autre`

**Code clé (financeService.ts:307-367) :**
```typescript
static async categorizeTransactions(profileId: string, transactionIds: string[]) {
  // 1. Récupération des transactions
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, account: { bank: { profileId } } }
  });

  // 2. Récupération de la clé API utilisateur
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { settings: true }
  });
  const apiKey = (profile?.settings as any)?.google_gemini_summaries;

  if (!apiKey) {
    throw new Error('No API key configured. Please add your Gemini API key in Settings.');
  }

  // 3. Appel au service de catégorisation IA
  const txData = transactions.map(t => ({
    description: t.description,
    amount: t.amount.toNumber(),
    id: t.id
  }));

  const categorizedMap = await categorizerService.categorizeBatch(txData, apiKey);
  
  // 4. Mise à jour des transactions
  await Promise.all(updates);
}
```

**Prompt IA (categorizerService.ts:23-32) :**
```
Tu es un assistant comptable expert. Classe les transactions suivantes dans une de ces catégories : 
[Alimentation, Logement, Transport, Loisirs, Santé, Shopping, Services, Restaurants, Salaires, Virements, Autre].

Si aucune catégorie ne correspond parfaitement, choisis la plus logique ou "Autre".
Réponds UNIQUEMENT via un objet JSON où la clé est l'index (1, 2...) et la valeur est la catégorie exacte.
```

### 2. Audit Financier IA (Analyse de Dépenses)

**Endpoint :** `POST /api/finance/audit`  
**Contrôleur :** `financeController.ts` (lignes 316-328)  
**Service :** `financeService.ts` (lignes 505-541)

**Description :**
- Analyse des 50 dernières transactions
- Génération d'un résumé avec tendances et conseils
- Réponse personnalisée en français

**Configuration requise :**
- `finance_audit_provider` : `'google'` ou `'perplexity'`
- `finance_audit_model` : modèle selon provider
- `google_gemini_summaries` ou `perplexity_summaries` : clé API

**Code clé (financeService.ts:505-541) :**
```typescript
static async generateAudit(profileId: string, transactions: any[]) {
  // Récupération des paramètres utilisateur
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { settings: true }
  });

  const settings = (profile?.settings as any) || {};
  const provider = settings.finance_audit_provider || 'google';
  const model = settings.finance_audit_model || 'gemini-1.5-flash';

  // Sélection de la clé selon le provider
  let apiKey = '';
  if (provider === 'google') {
    apiKey = settings.google_gemini_summaries || process.env.GEMINI_API_KEY || '';
  } else {
    apiKey = settings.perplexity_summaries || process.env.PERPLEXITY_API_KEY || '';
  }

  if (!apiKey) {
    throw new Error(`No API key configured. Please add it in Settings.`);
  }

  // Préparation des données (50 dernières transactions)
  const txList = transactions
    .slice(0, 50)
    .map(t => `[${new Date(t.date).toLocaleDateString()}] ${t.amount}€ - ${t.description} (${t.category || 'Sans catégorie'})`)
    .join('\n');

  // Prompt système et utilisateur
  const systemPrompt = "Tu es un analyste financier personnel expert...";
  const prompt = `Voici mes dernières transactions :\n${txList}\n\nAnalyse ma situation financière récente...`;

  // Appel IA
  const auditText = await aiService.generateText(prompt, systemPrompt, model, apiKey);
  return { audit: auditText };
}
```

---

## ⚙️ Architecture du Service IA

### aiService.ts (Couche d'abstraction)

**Localisation :** `server/src/services/aiService.ts`

**Fonctionnalités :**
- Support dual : Google Gemini et Perplexity
- Validation des prompts (limite 50 000 caractères)
- Retry logic pour erreurs 503
- Gestion des erreurs spécifiques (401, 404, 429)

**Sélection de la clé API :**
```typescript
// Priorité : Clé utilisateur > Clé serveur
const effectiveKey = apiKey || process.env.GEMINI_API_KEY;

if (!effectiveKey) {
  throw new Error('No API key provided. Please configure your Google Gemini API key in Settings.');
}
```

**Mapping des modèles :**
```typescript
const mapModelName = (model: string): string => {
  const modelMap: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-2.0-pro': 'gemini-2.0-pro',
    'sonar-pro': 'sonar-pro',
    'sonar': 'sonar',
    'sonar-reasoning': 'sonar-reasoning'
  };
  return modelMap[model] || model;
};
```

---

## 🔒 Sécurité et Confidentialité

### 1. Stockage Sécurisé

- **Chiffrement** : Les clés transitent via HTTPS
- **Stockage** : Base de données PostgreSQL (champ JSON `settings`)
- **Masquage UI** : Input type password avec toggle Eye/EyeOff
- **Isolation** : Une clé par profil utilisateur

### 2. Validation des Accès

**Authentification requise sur tous les endpoints IA :**
```typescript
interface AuthRequest extends Request {
  user?: { id: string };
}

// Middleware auth appliqué sur toutes les routes /api/finance/*
```

**Vérification de propriété des données :**
```typescript
// Exemple : vérification que les transactions appartiennent à l'utilisateur
const transactions = await prisma.transaction.findMany({
  where: {
    id: { in: transactionIds },
    account: { bank: { profileId } } // ← Sécurité : filtre par profil
  }
});
```

### 3. Protection contre les Abus

**Limites de taille des prompts :**
```typescript
const MAX_PROMPT_LENGTH = 50000;
if (fullPrompt.length > MAX_PROMPT_LENGTH) {
  throw new Error(
    `Le contenu est trop volumineux (${fullPrompt.length} caractères). ` +
    `Limite: ${MAX_PROMPT_LENGTH} caractères.`
  );
}
```

**Compteur de générations (rate limiting doux) :**
```typescript
// Incrémentation après chaque appel IA
if (req.user?.id) {
  await incrementAIGeneration(req.user.id);
}

// Schema Prisma
model Profile {
  aiGenerationsCount Int @default(0)
}
```

---

## 📊 Tableau Récapitulatif

| Fonctionnalité | Endpoint | Clé API Utilisée | Provider Supporté | Fichier Principal |
|----------------|----------|------------------|-------------------|-------------------|
| **Catégorisation transactions** | `POST /api/finance/transactions/categorize` | `google_gemini_summaries` | Gemini uniquement | `categorizerService.ts` |
| **Audit financier** | `POST /api/finance/audit` | `google_gemini_summaries` ou `perplexity_summaries` | Gemini + Perplexity | `financeService.ts` |
| **Configuration clés** | `POST /api/profiles/api-keys` | - | - | `ApiKeySettings.tsx` |

---

## 🔧 Routes API Concernées

### Routes FinanceTrack avec IA (`financeRoutes.ts`)

```typescript
// Lignes 64-65 : Catégorisation
router.post('/transactions/categorize', categorizeTransactions);
router.post('/transactions/auto-categorize', autoCategorizeTransactions);  // Non-IA (mots-clés)

// Ligne 76 : Audit IA
router.post('/audit', audit);
```

---

## 💡 Recommandations d'Utilisation

### Pour les Utilisateurs

1. **Créer une clé API dédiée** sur Google AI Studio ou Perplexity
2. **Ne pas partager** sa clé API
3. **Choisir le modèle adapté** :
   - `gemini-1.5-flash` : Rapide et économique (recommandé)
   - `gemini-2.0-pro` : Plus précis mais plus lent
   - `sonar` : Bon rapport qualité/prix Perplexity

### Pour les Développeurs

1. **Toujours vérifier** que l'utilisateur est authentifié
2. **Valider les entrées** avant envoi à l'IA (Zod schemas)
3. **Gérer les erreurs** API de manière gracieuse
4. **Surveiller les quotas** d'API (message 429)

---

## 📁 Fichiers Clés Récapitulatifs

| Fichier | Rôle | Lignes Importantes |
|---------|------|-------------------|
| `client/src/components/profile/ApiKeySettings.tsx` | UI configuration clés | 11-43, 148-197 |
| `client/src/pages/SettingsPage.tsx` | Page settings avec onglet API | 105-112 |
| `server/src/services/aiService.ts` | Couche abstraction IA | 29-213 |
| `server/src/services/categorizerService.ts` | Logique catégorisation IA | 11-72 |
| `server/src/services/financeService.ts` | Service métier FinanceTrack | 307-367, 505-541 |
| `server/src/controllers/financeController.ts` | Contrôleurs API Finance | 251-263, 316-328 |
| `server/src/routes/financeRoutes.ts` | Définition routes | 64-65, 76 |
| `server/prisma/schema.prisma` | Schéma base de données | 11-41 (Profile) |

---

## 🚀 Prochaines Évolutions Possibles

- [ ] **Auto-catégorisation en temps réel** lors de l'import
- [ ] **Prévisions de cashflow** basées sur l'historique (ML)
- [ ] **Détection d'anomalies** frauduleuses via IA
- [ ] **Chatbot financier** conversationnel
- [ ] **Export vers comptable** avec rapports IA générés

---

*Document généré automatiquement - FinanceTrack IA Architecture*

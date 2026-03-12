# 📚 EduTrack V2 - Documentation Complète d'Architecture

**Version:** 2.0  
**Date de génération:** 12 Mars 2026  
**Chemin du projet:** `C:\Users\Vincent\.gemini\antigravity\scratch\EduTrack-V2`

---

## 📋 Vue d'Ensemble

EduTrack V2 est une **plateforme web fullstack** de gestion d'apprentissage (LMS - Learning Management System) multi-fonctionnelle. Elle combine deux modules principaux :

- **📖 EduTrack** : Gestion de cours, notes, flashcards, mind maps et planification d'étude
- **💰 FinanceTrack** : Suivi financier personnel, import bancaire, budgets et objectifs d'épargne

Le projet est architecturé selon une approche **SPA (Single Page Application)** avec une séparation claire entre frontend et backend, conteneurisé avec Docker pour faciliter le déploiement.

---

## 🏗️ Architecture Globale

### Structure des Répertoires

```
EduTrack-V2/
├── 📁 client/                 # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Composants React réutilisables (~50 composants)
│   │   ├── pages/             # Pages/Routes (18+ pages)
│   │   ├── layouts/           # Layouts spécifiques (EduLayout, FinanceLayout)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # Zustand stores
│   │   ├── lib/               # Utilitaires et services
│   │   ├── types/             # Types TypeScript
│   │   └── constants/         # Constantes
│   ├── Dockerfile
│   └── nginx.conf             # Configuration Nginx (production)
│
├── 📁 server/                 # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/            # Endpoints API REST (17 fichiers)
│   │   ├── controllers/       # Logique métier (26 contrôleurs)
│   │   ├── services/          # Services métier
│   │   ├── middleware/        # Middleware (auth, validation)
│   │   ├── types/             # Types TypeScript
│   │   └── utils/             # Utilitaires
│   ├── prisma/
│   │   └── schema.prisma      # Schéma Prisma (~525 lignes)
│   └── Dockerfile
│
├── 📁 docs/                   # Documentation additionnelle
├── docker-compose.yml         # Orchestration Docker
├── TECH_STACK.md              # Documentation technique
└── CHANGELOG.md               # Historique des versions
```

---

## 🎨 Architecture Frontend

### Technologies Core

| Technologie | Version | Rôle |
|------------|---------|------|
| **React** | 18.2 | Framework UI réactif |
| **TypeScript** | 5.2+ | Type safety et meilleure DX |
| **Vite** | 6.4 | Build tool ultra-rapide avec HMR |
| **Tailwind CSS** | 3.3 | Styling utility-first |

### Gestion d'État

```
┌─────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                      │
├─────────────────────────────────────────────────────────┤
│  TanStack Query (React Query)                            │
│  └── Cache serveur, synchronisation données            │
│                                                          │
│  Zustand                                                 │
│  └── État global local (UI, auth, préférences)           │
│                                                          │
│  IndexedDB (Dexie)                                       │
│  └── Cache offline persistant                            │
└─────────────────────────────────────────────────────────┘
```

### Routing et Navigation

**React Router DOM v6** avec lazy loading pour optimiser les performances :

```typescript
// Structure des routes (App.tsx)
/
├── /auth (redirect → /)
├── /hub (HubPage - sélection profil)
│
├── /edu/* (EduTrack Layout)
│   ├── dashboard
│   ├── library
│   ├── focus
│   ├── settings
│   ├── board (Investigation Board)
│   ├── mindmaps
│   ├── course/:courseId
│   ├── course/:courseId/item/:itemId
│   ├── folder/:folderId
│   ├── flashcards
│   ├── flashcards/study/:setId
│   ├── quiz/study/:id
│   ├── calendar
│   └── profiles
│
└── /finance/* (FinanceTrack Layout)
    ├── dashboard
    ├── import
    ├── categories
    ├── bank/:bankId
    ├── account/:accountId
    ├── settings
    ├── recurring
    ├── savings
    ├── rules
    └── reports
```

### Composants Principaux

#### Gestion de Contenu
- **`Editor.tsx`** : Éditeur WYSIWYG Tiptap (18KB)
- **`FilePreview.tsx`** : Visionneuse multi-format (PDF, DOCX, images, Office)
- **`PDFViewer.tsx`** / **`DocxViewer.tsx`** / **`OfficeViewer.tsx`** : Viewers spécialisés

#### Génération IA
- **`GenerateFlashcardsModal.tsx`** : Génération automatique de flashcards
- **`GenerateExerciseModal.tsx`** : Création de QCM/exercices
- **`GenerateMindMapModal.tsx`** : Création de mind maps (28KB)
- **`SummaryPanel.tsx`** : Génération de résumés intelligents

#### Organisation
- **`CourseGridItem.tsx`** / **`CourseListItem.tsx`** : Affichage cours
- **`FolderTree.tsx`** : Navigation arborescente
- **`CalendarWidget.tsx`** : Widget calendrier
- **`FocusTimer.tsx`** : Timer de concentration (Pomodoro)

#### FinanceTrack
- Sous-dossier `components/finance/` avec composants spécifiques
- Sous-dossier `pages/finance/` avec 7+ pages dédiées

### Traitement de Documents

| Format | Technologie | Capacité |
|--------|-------------|----------|
| PDF | PDF.js + react-pdf | Visualisation native |
| DOCX | Mammoth + docx-preview | Rendu HTML |
| Office | Microsoft/Google Viewers | Aperçu intégré |
| Images | Sharp + compression | Optimisation |
| OCR | Tesseract.js | Extraction texte |

---

## 🔧 Architecture Backend

### Stack Technique

| Technologie | Version | Rôle |
|------------|---------|------|
| **Node.js** | 20+ | Runtime JavaScript |
| **Express** | 4.18 | Framework web |
| **TypeScript** | 5.3 | Type safety |
| **Prisma** | 5.7+ | ORM et migrations |
| **PostgreSQL** | 15 | Base de données |
| **Socket.IO** | 4.7 | WebSockets temps réel |

### Structure API REST

```
/api
├── /auth              → authRoutes.ts        → authController.ts
├── /profiles          → profileRoutes.ts     → profileController.ts
├── /courses           → courseRoutes.ts      → courseController.ts
├── /items             → itemRoutes.ts        → itemController.ts
├── /folders           → folderRoutes.ts      → folderController.ts
├── /flashcards        → flashcardRoutes.ts   → flashcardController.ts
├── /quizzes           → quizRoutes.ts        → quizController.ts
├── /mindmaps          → mindmapRoutes.ts     → mindmapController.ts
├── /summaries         → summaryRoutes.ts     → summaryController.ts
├── /study-plans       → studyPlanRoutes.ts   → studyPlanController.ts
├── /calendar          → calendarRoutes.ts    → calendarController.ts
├── /categories        → categoryRoutes.ts    → categoryController.ts
├── /ai                → aiRoutes.ts          → aiController.ts
├── /storage           → storageRoutes.ts     → storageController.ts
├── /analytics         → analyticsRoutes.ts    → analyticsController.ts
│
└── /finance/*         → financeRoutes.ts     → financeController.ts
    ├── /banks         → bankController.ts
    ├── /accounts      → accountController.ts
    ├── /transactions  → transactionController.ts
    ├── /categories    → categoryController.ts
    ├── /budgets       → budgetController.ts
    ├── /recurring     → recurringController.ts
    ├── /savings       → savingsGoalController.ts
    ├── /rules         → rulesController.ts
    └── /alerts        → alertController.ts
```

### Middleware

| Middleware | Fonction |
|------------|----------|
| **helmet** | Sécurité headers HTTP |
| **cors** | Cross-origin resource sharing |
| **morgan** | Logging HTTP |
| **compression** | Compression gzip/brotli |
| **JWT** | Authentification stateless |
| **Multer** | Upload multipart files |

### Gestion de Fichiers

**Deux modes de stockage :**

1. **Local** : Stockage filesystem dans `/uploads`
2. **S3/MinIO** : Stockage objet compatible S3

**Flux d'upload :**
```
Client → Multer → StorageService → [Local/S3] → DB (metadata)
```

---

## 🗄️ Base de Données

### Schéma Prisma (Overview)

```
┌─────────────────────────────────────────────────────────────────┐
│                     MODÈLES PRINCIPAUX                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Profile (Utilisateur)                                           │
│  ├── id, name, email, passwordHash, avatar                       │
│  ├── courses[], folders[], items[]                               │
│  ├── flashcards[], quizzes[], summaries[]                       │
│  ├── studyPlans[], mindmaps[], studySessions[]                  │
│  └── banks[], budgets[], recurringTransactions[], savingsGoals[]  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    EDUTRACK MODELS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Course                                                          │
│  ├── id, profileId, title, description, color, icon             │
│  ├── folderId, isFavorite                                        │
│  └── items[], studyPlans[], studySessions[], summaries[]        │
│                                                                 │
│  Item (Note/Exercise/Resource)                                   │
│  ├── id, profileId, courseId, type, title                       │
│  ├── content, fileUrl, fileName, fileType                       │
│  ├── thumbnailUrl, storageKey, status                           │
│  ├── difficulty, tags, extractedContent                         │
│  └── relations: profile, course                                  │
│                                                                 │
│  Folder (Arborescence)                                          │
│  ├── id, profileId, name, parentId                               │
│  └── children[], courses[]                                       │
│                                                                 │
│  FlashcardSet / Flashcard                                       │
│  ├── Algorithme SM-2 (interval, easeFactor, nextReview)         │
│  └── Relations: set → flashcards[]                               │
│                                                                 │
│  Quiz / QuizQuestion                                            │
│  ├── difficulty, questionCount, bestScore                       │
│  └── Relations: quiz → questions[]                             │
│                                                                 │
│  MindMap                                                        │
│  ├── content (Mermaid syntax), sources                           │
│  └── Relations: profile, course                                  │
│                                                                 │
│  Summary                                                        │
│  ├── itemId, itemType, content, stats, options                  │
│  └── Relations: profile, course                                  │
│                                                                 │
│  StudyPlan / StudyWeek / StudyTask                               │
│  ├── goal, deadline, hoursPerWeek, status                       │
│  └── Relations hiérarchiques                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                  FINANCETRACK MODELS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bank                                                            │
│  ├── name, swiftBic, color, icon, metadata                      │
│  └── accounts[]                                                  │
│                                                                 │
│  Account                                                         │
│  ├── type (CHECKING|SAVINGS|CREDIT|INVESTMENT|LOAN|OTHER)        │
│  ├── iban, accountNumber, currency, balance                    │
│  ├── autoDetected, importMetadata                               │
│  └── transactions[]                                              │
│                                                                 │
│  Transaction                                                     │
│  ├── date, amount, description, beneficiaryIban                 │
│  ├── classification (EXTERNAL|INTERNAL|UNKNOWN)                  │
│  ├── fitId (identifiant OFX unique)                             │
│  ├── category, importSource, metadata                           │
│  └── relations: account                                          │
│                                                                 │
│  TransactionCategory                                             │
│  ├── name, type (INCOME|EXPENSE), icon, color                   │
│  ├── keywords[], parentId (hiérarchie)                          │
│  └── children[], budgets[]                                       │
│                                                                 │
│  Budget                                                          │
│  ├── amount, period (MONTHLY|WEEKLY|YEARLY)                     │
│  └── relations: profile, category                                │
│                                                                 │
│  RecurringTransaction                                            │
│  ├── description, averageAmount, estimatedDay                  │
│  ├── frequency (WEEKLY|MONTHLY|QUARTERLY|YEARLY)                │
│  ├── nextExpectedDate, occurrenceCount, confidenceScore        │
│  └── relations: profile                                          │
│                                                                 │
│  SavingsGoal                                                     │
│  ├── name, targetAmount, currentAmount, deadline                │
│  ├── monthlyTarget, icon, color                                 │
│  ├── status (ACTIVE|COMPLETED|ABANDONED)                        │
│  └── relations: profile                                          │
│                                                                 │
│  AutoCategorizeRule                                              │
│  ├── name, priority, conditions (JSON)                          │
│  ├── categoryName, isActive, matchCount                         │
│  └── relations: profile                                          │
│                                                                 │
│  FinanceAlert                                                    │
│  ├── type (BUDGET_EXCEEDED|LOW_BALANCE|UNUSUAL|...)             │
│  ├── severity (INFO|WARNING|CRITICAL|CELEBRATION)              │
│  ├── title, message, data (JSON)                                │
│  └── relations: profile                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Indices et Contraintes

- **Unicité** : Email (Profile), [profileId, name] (Bank), [bankId, iban] (Account)
- **Prévention doublons** : [accountId, fitId], [accountId, date, amount, description] (Transaction)
- **Performance** : Indices sur tous les champs de relation (profileId, courseId, etc.)

---

## 🚀 Fonctionnalités Principales

### 1. 📚 EduTrack - Gestion d'Apprentissage

#### Organisation
- **Cours** : Création avec couleurs, icônes, hiérarchie par dossiers
- **Items** : Notes, exercices, ressources avec contenu WYSIWYG
- **Fichiers** : Upload multi-format avec thumbnails automatiques
- **Navigation** : Vue grille/liste, favoris, recherche globale

#### Génération IA (Google Gemini)
- **Flashcards** : Génération depuis contenu avec algorithme SM-2
- **QCM** : Questions à choix multiples avec correction
- **Mind Maps** : Diagrammes visuels interactifs (ReactFlow)
- **Résumés** : Compression configurable de contenu

#### Étude
- **Session focus** : Timer Pomodoro avec statistiques
- **Flashcards** : Révision espacée avec suivi de progression
- **Quiz** : Mode entraînement et évaluation
- **Calendrier** : Planification et rappels

#### Collaboration
- **Socket.IO** : Temps réel pour mises à jour
- **Tableau d'investigation** : Organisation visuelle

### 2. 💰 FinanceTrack - Suivi Financier

#### Gestion Bancaire
- **Multi-banques** : Support de plusieurs établissements
- **Multi-comptes** : Types (courant, épargne, crédit, etc.)
- **Import automatique** : OFX, CSV avec détection intelligente

#### Transactions
- **Classification automatique** : Virements internes vs externes
- **Catégorisation** : Hiérarchie avec mots-clés
- **Règles auto** : Conditions pour catégorisation automatique
- **Détection doublons** : Via FITID OFX ou heuristique

#### Analyse
- **Budgets** : Limites par catégorie et période
- **Transactions récurrentes** : Détection et prévision
- **Objectifs d'épargne** : Suivi avec projections
- **Alertes** : Budget dépassé, solde bas, anomalies
- **Rapports mensuels** : Graphiques et statistiques

---

## 🐳 Infrastructure & Déploiement

### Docker Compose Services

```yaml
services:
  postgres:        # Base de données PostgreSQL 15
  backend:         # API Node.js/Express (port 3000)
  frontend:        # React + Nginx (port 80)
  minio:          # Stockage S3-compatible (ports 9000/9001)
```

### Configuration Environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DATABASE_URL` | Connexion PostgreSQL | - |
| `JWT_SECRET` | Clé signature tokens | - |
| `CORS_ORIGIN` | Origines autorisées | `https://hubtrack.vpdeploy.com` |
| `STORAGE_TYPE` | Mode stockage | `local` |
| `AWS_*` | Credentials S3/MinIO | - |
| `VITE_API_URL` | URL API frontend | `/api` |

### Déploiement Dokploy

Guide détaillé dans `DOKPLOY_DEPLOYMENT_GUIDE.md` :
- Configuration reverse proxy (Traefik/Nginx)
- Variables d'environnement
- Volumes persistants
- SSL/TLS automatique

---

## 🔒 Sécurité

### Authentification
- **JWT** : Tokens stateless avec expiration
- **bcryptjs** : Hachage mots de passe (salt rounds: 10)
- **Protection routes** : Middleware `RequireAuth`

### Protection Serveur
- **Helmet** : Headers sécurisés (CSP, HSTS, etc.)
- **CORS** : Whitelist d'origines strict
- **Rate limiting** : Préparation (à implémenter)
- **Input validation** : Zod schemas

### Données
- **Prisma** : Requêtes paramétrées (anti-SQL injection)
- **File upload** : Validation type et taille
- **HTTPS** : Requis en production

---

## ⚡ Performance

### Frontend
- **Code splitting** : Lazy loading par route
- **TanStack Query** : Cache intelligent avec stale-while-revalidate
- **Image optimization** : Compression Sharp + lazy loading
- **Virtual scrolling** : Pour listes longues

### Backend
- **Prisma connection pooling** : Réutilisation connexions DB
- **Compression** : gzip/brotli middleware
- **Socket.IO** : WebSocket vs polling adaptatif

### Base de données
- **Indices** : Sur tous les champs de jointure
- **Pagination** : Toutes les listes paginées
- **Select n+1** : Optimisé avec `include` Prisma

---

## 📊 Flux de Données Typiques

### 1. Upload de Fichier

```
[Client]
  │
  │ 1. Sélection fichier
  ▼
[Multer Middleware] ──→ Validation type/taille
  │
  ▼
[StorageService] ────→ [Local Filesystem / MinIO S3]
  │
  ▼
[Prisma] ─────────────→ PostgreSQL (metadata)
  │
  ▼
[Client] ←──────────── URL fichier + thumbnail
```

### 2. Génération IA (Flashcards)

```
[Client] ──→ texte/PDF extrait
  │
  ▼
[aiRoutes] ──→ validation
  │
  ▼
[aiController] ──→ Google Gemini API
  │
  ▼
[Gemini] ──→ JSON structuré (flashcards)
  │
  ▼
[flashcardController] ──→ Création DB
  │
  ▼
[Client] ←── Flashcards générées
```

### 3. Import Bancaire (OFX)

```
[Fichier OFX] ──→ Upload
  │
  ▼
[financeController] ──→ Parsing OFX
  │
  ▼
[Classification] ──→ Détection virements internes
  │
  ▼
[Détection doublons] ──→ FITID / Heuristique
  │
  ▼
[Auto-catégorisation] ──→ Règles utilisateur
  │
  ▼
[Prisma] ──→ Transactions créées
  │
  ▼
[Alertes] ──→ Budgets dépassés ?
  │
  ▼
[Client] ←── Résumé import
```

---

## 🎯 Points Forts de l'Architecture

### 1. **Modularité**
- Séparation claire EduTrack / FinanceTrack
- Composants réutilisables avec types stricts
- Routes et contrôleurs organisés par domaine

### 2. **Type Safety**
- TypeScript frontend et backend
- Prisma Client génère types automatiquement
- Zod pour validation runtime

### 3. **Scalabilité**
- Stateless backend (pas de session serveur)
- Stockage S3-compatible (AWS/MinIO)
- Socket.IO pour temps réel

### 4. **Offline-First**
- IndexedDB pour cache local
- TanStack Query gère synchronisation
- Lazy loading pour performance

### 5. **Extensibilité**
- Architecture modulaire facilement extensible
- Middleware Express chaînable
- Système de plugins envisagé

---

## 📝 Conclusion

EduTrack V2 est une application moderne et bien architecturée qui combine :

- **Frontend React** performant avec tooling Vite
- **Backend Express** robuste avec Prisma ORM
- **Base PostgreSQL** relationnelle avec schéma complet
- **Conteneurisation Docker** pour déploiement facile
- **Intégrations IA** via Google Gemini
- **Fonctionnalités riches** éducation + finance

Le projet suit les meilleures pratiques actuelles :
- TypeScript fullstack
- Separation of concerns
- RESTful API design
- Component-based UI
- DevOps avec Docker

---

*Document généré automatiquement - EduTrack V2 Architecture Overview*

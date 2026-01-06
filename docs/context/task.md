# Plan de Recréation EduTrack V2 - Hébergement Dokploy

## Phase 1: Analyse & Architecture
- [x] Analyser la structure existante du projet client
- [x] Identifier les dépendances et configurations
- [x] Définir l'architecture backend pour Dokploy
- [x] Planifier la migration vers PostgreSQL
- [x] Concevoir l'API RESTful

## Phase 2: Configuration Dokploy
- [x] Créer configuration docker-compose.yml
- [x] Configurer PostgreSQL service
- [x] Configurer service backend (Node.js/Express)
- [x] Configurer service frontend (Nginx)
- [x] Configurer volume pour storage S3/local
- [x] Créer variables d'environnement

## Phase 3: Backend Development
- [x] Initialiser projet backend Node.js
  - [x] Setup Express + TypeScript
  - [x] Configuration Prisma/TypeORM pour PostgreSQL
  - [x] JWT Authentication
- [/] API Endpoints
  - [x] Auth routes (register, login, logout)
  - [ ] Profile routes
  - [x] Course routes (CRUD)
  - [x] Folder routes (CRUD)
  - [x] Item routes (CRUD + upload)
  - [x] Flashcard routes (Placeholder)
  - [x] Quiz routes (Placeholder)
  - [x] Analytics routes
- [x] Services
  - [x] File upload service (S3 ou stockage local)
  - [x] Synchronisation temps réel (WebSocket ou polling)
  - [ ] Intégration IA (Gemini/Perplexity)
  - [ ] OCR service (Tesseract.js côté serveur)

## Phase 4: Adaptation Frontend
- [x] Retirer Dexie (IndexedDB)
- [x] Implémenter clients API HTTP
- [x] Migrer stores Zustand pour API backend
- [x] Configurer variables d'environnement (VITE_API_URL)
- [x] Adapter gestion fichiers (upload vers backend)
- [x] Implémenter synchronisation temps réel
- [x] Correction erreurs compilation (Server & Client OK)

## Phase 5: Base de Données PostgreSQL
- [ ] Créer schéma database
  - [ ] Tables: profiles, courses, folders, items
  - [x] Tables: flashcard_sets, flashcards, quizzes, quiz_questions
  - [x] Tables: study_plans, analytics, sessions
- [ ] Créer migrations
- [ ] Seed data de test

## Phase 6: Tests & Vérification
- [ ] Tests backend (API endpoints)
- [ ] Tests frontend (intégration API)
- [ ] Tests upload fichiers
- [ ] Tests synchronisation multi-appareils
- [ ] Tests performance (5 utilisateurs simultanés)

## Phase 7: Déploiement Dokploy
- [x] Créer Guide de Déploiement (deployment_guide.md)
- [x] Créer projet Dokploy
- [x] Déployer services via docker-compose (Backend Fixé: prisma generate + openSSL)
- [x] Configurer reverse proxy (CORS Fixé: dynamic origin)
- [/] Tester accès réseau local (Backend OK, Frontend: waiting for rebuild with correct API URL)
- [ ] Configurer backup automatique BDD

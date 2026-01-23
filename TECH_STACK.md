# 🚀 EduTrack - Stack Technique

**Version:** 2.0  
**Dernière mise à jour:** Janvier 2026

---

## 📋 Vue d'ensemble

EduTrack est une plateforme web moderne de gestion d'apprentissage (LMS) conçue pour offrir une expérience utilisateur riche avec des fonctionnalités avancées d'organisation de cours, de génération de contenu IA, et de collaboration en temps réel.

---

## 🎨 Frontend

### Core Framework
| Technologie | Version | Utilisation |
|------------|---------|-------------|
| **React** | 18.2 | Interface utilisateur réactive |
| **TypeScript** | 5.2 | Type safety et DX amélioré |
| **Vite** | 6.4 | Build tool ultra-rapide |

### State Management & Data Fetching
- **TanStack Query (React Query)** `^5.90` - Gestion de cache et fetching asynchrone
- **Zustand** `^4.4` - State management global léger
- **Dexie** `^3.2` - IndexedDB pour cache offline

### Routing & Navigation
- **React Router DOM** `^6.18` - Navigation SPA
- **@headlessui/react** `^2.2` - Composants accessibles (dropdowns, modals)

### Styling
- **Tailwind CSS** `^3.3` - Utility-first CSS framework
- **Lucide React** `^0.292` - Bibliothèque d'icônes moderne
- **clsx** + **tailwind-merge** - Gestion conditionnelle de classes

### Rich Text & Documents
- **Tiptap** `^2.27` - Éditeur WYSIWYG extensible
  - Extensions: Color, Highlight, Placeholder, Underline, TextStyle
- **PDF.js** `5.4` + **react-pdf** `^10.3` - Visualisation PDF native
- **Mammoth** `^1.6` - Conversion DOCX → HTML
- **docx** `^9.5` - Génération de documents Word
- **html2pdf.js** + **jspdf** - Export PDF côté client
- **React Markdown** `^10.1` - Rendu Markdown

### Data Visualization
- **Recharts** `^3.6` - Graphiques et analytics
- **ReactFlow / @xyflow/react** `^12.10` - Mind maps et diagrammes interactifs
- **Mermaid** `^11.12` - Diagrammes déclaratifs

### File Processing
- **Tesseract.js** `^7.0` - OCR (reconnaissance de texte)
- **browser-image-compression** `^2.0` - Compression d'images
- **heic2any** `^0.0.4` - Conversion HEIC
- **Sharp** (via API backend) - Traitement d'images côté serveur

### Real-time Collaboration
- **Yjs** `^13.6` - CRDT pour édition collaborative
- **y-webrtc** `^10.3` - Synchronisation peer-to-peer
- **y-indexeddb** `^9.0` - Persistence locale
- **Socket.IO Client** `^4.8` - WebSockets temps réel

### UI Components & Interactions
- **@dnd-kit** `^6.0` - Drag & drop accessible
- **react-zoom-pan-pinch** `^3.7` - Zoom/pan pour images
- **cmdk** `^1.1` - Command palette (⌘K)
- **Sonner** `^2.0` - Toast notifications élégantes

### Testing
- **Vitest** `^4.0` - Test runner ultra-rapide
- **Testing Library** - Tests composants React
- **Happy-DOM** / **jsdom** - Environnements de test

---

## 🔧 Backend

### Runtime & Framework
| Technologie | Version | Utilisation |
|------------|---------|-------------|
| **Node.js** | 20+ | Runtime JavaScript |
| **Express** | 4.18 | Framework web minimaliste |
| **TypeScript** | 5.3 | Type safety backend |

### Database & ORM
- **PostgreSQL** (via Docker) - Base de données relationnelle
- **Prisma** `^5.7` - ORM moderne avec type-safety
  - Migrations automatiques
  - Schema-first approach
  - Introspection DB

### Storage
- **MinIO** (S3-compatible) - Stockage objet auto-hébergé
- **AWS SDK S3 Client** `^3.474` - Intégration S3
- **Multer** `^1.4` - Upload de fichiers multipart

### Authentication & Security
- **JWT (jsonwebtoken)** `^9.0` - Tokens d'authentification
- **bcryptjs** `^2.4` - Hachage de mots de passe
- **Helmet** `^7.1` - Headers de sécurité HTTP
- **CORS** `^2.8` - Cross-Origin Resource Sharing

### AI & Document Processing
- **@google/generative-ai** `^0.24` - Google Gemini API (génération de flashcards, QCM, résumés)
- **Mammoth** `^1.11` - Extraction texte DOCX
- **pdf-parse** `1.1` - Extraction texte PDF
- **Sharp** `^0.34` - Optimisation images (thumbnails, compression)

### Real-time & Performance
- **Socket.IO** `^4.7` - WebSockets bidirectionnels
- **Compression** `^1.8` - Compression gzip/brotli
- **Morgan** `^1.10` - HTTP request logger

### Validation
- **Zod** `^3.22` - Validation de schémas runtime

---

## 🐳 Infrastructure & Déploiement

### Containerization
```yaml
Docker Compose Services:
  - PostgreSQL (DB principale)
  - MinIO (Stockage S3)
  - Client (Frontend React)
  - Server (Backend Node.js)
```

### Orchestration
- **Dokploy** - Plateforme de déploiement auto-hébergée (alternative Vercel/Heroku)
- **Docker** - Containerisation des services
- **Nginx** - Reverse proxy et serveur statique

### CI/CD
- **Git** - Versioning
- **GitHub** - Repository principal

---

## 🔌 APIs & Services Externes

### AI Services
| Service | Utilisation |
|---------|-------------|
| **Google Gemini** | Génération de contenu (flashcards, QCM, résumés, mind maps) |
| **Perplexity API** | Alternative IA pour génération |

### Document Viewers
- **Microsoft Office Web Viewer** - Aperçu DOCX/XLSX/PPTX
- **Google Docs Viewer** - Fallback pour documents Office

---

## 📦 Structure du Projet

```
EduTrack-V2/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── pages/         # Pages/routes
│   │   ├── lib/           # Utilitaires et services
│   │   ├── hooks/         # Custom hooks React
│   │   ├── store/         # Zustand stores
│   │   └── data/          # Fichiers statiques (changelog, etc.)
│   ├── nginx.conf         # Configuration Nginx
│   └── package.json
│
├── server/                # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/        # Endpoints API REST
│   │   ├── services/      # Logique métier
│   │   ├── middleware/    # Auth, validation, etc.
│   │   └── index.ts       # Entry point
│   ├── prisma/
│   │   └── schema.prisma  # Schéma base de données
│   └── package.json
│
├── docs/                  # Documentation
├── docker-compose.yml     # Services Docker
└── CHANGELOG.md           # Historique des versions
```

---

## 🎯 Fonctionnalités Clés

### 📚 Gestion de Cours
- Création/édition WYSIWYG (Tiptap)
- Upload de fichiers multi-formats (PDF, DOCX, images, vidéos)
- Extraction automatique de contenu (OCR, parsing)
- Visionneuse intégrée (PDF, Office, images)

### 🤖 Génération IA
- **Flashcards** automatiques depuis notes/PDFs
- **QCM** avec correction automatique
- **Mind Maps** visuelles (ReactFlow)
- **Résumés** intelligents avec compression configurable

### 👥 Collaboration
- Édition collaborative temps réel (Yjs)
- Synchronisation multi-utilisateurs
- Commentaires et annotations

### 📊 Analytics
- Suivi de progression
- Statistiques de révision (Recharts)
- Heatmaps d'activité

### 📱 Multi-plateforme
- Responsive design (mobile-first)
- PWA capabilities (offline-first)
- Touch optimizations

---

## 🔒 Sécurité

- **JWT Tokens** - Authentification stateless
- **bcrypt** - Hachage de mots de passe (10 rounds)
- **Helmet.js** - Protection headers HTTP
- **CORS** configuré - Protection CSRF
- **Validation Zod** - Sanitization des inputs
- **Rate limiting** - Protection DDoS (à implémenter)

---

## 📈 Performance

### Frontend
- **Code splitting** (Vite lazy loading)
- **Image optimization** (Sharp, compression)
- **Virtual scrolling** - Listes longues
- **Debouncing** - Recherche et filtres

### Backend
- **Connection pooling** (Prisma)
- **Response compression** (gzip/brotli)
- **Caching** - TanStack Query côté client
- **MinIO CDN** - Assets distribués

---

## 🛠️ Outils de Développement

### Code Quality
- **ESLint** - Linting JavaScript/TypeScript
- **TypeScript** - Type checking strict
- **Prettier** (recommandé) - Formatage de code

### DevOps
- **Nodemon** - Hot reload backend
- **Vite HMR** - Hot reload frontend
- **Prisma Studio** - GUI base de données

### Monitoring
- **Morgan** - Logs HTTP
- **Console.error** - Error tracking (à améliorer avec Sentry)

---

## 🚀 Évolutions Futures

### Q1 2026
- [ ] Intégration Stripe (paiements)
- [ ] Notifications push (Service Worker)
- [ ] Export mobile (React Native?)

### Q2 2026
- [ ] Plugin system (extensibilité)
- [ ] Gamification (badges, leaderboards)
- [ ] API publique (webhooks)

---

## 📝 Notes

- **Compatibilité navigateurs:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node.js requis:** v20.x ou supérieur
- **PostgreSQL:** v14+ recommandé
- **Stockage MinIO:** S3-compatible, peut être remplacé par AWS S3 en production

---

## 📞 Contacts & Ressources

- **Repository:** [GitHub - Weysmar/EduTrack-V2](https://github.com/Weysmar/EduTrack-V2)
- **Documentation:** `/docs` (à développer)
- **Changelog:** `CHANGELOG.md`

---

*Document généré automatiquement - Dernière mise à jour: Janvier 2026*

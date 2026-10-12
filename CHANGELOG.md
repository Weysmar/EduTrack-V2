# Changelog

## [2.1.0] - 2026-10-12

### 🔒 Sécurité (serveur)
- **Extraction de texte** : le dossier temporaire supprimé après extraction n'est plus dérivé du nom de fichier envoyé (un nom piégé pouvait faire supprimer un répertoire parent).
- **Fichiers servis** (`/storage/public`, `/storage/proxy`) : HTML, SVG et types inconnus forcés en téléchargement avec une CSP `sandbox`, `nosniff` partout.
- **Vignettes Office** : l'URL transmise à Microsoft/Google ne contient plus le JWT (helper `getPublicFileUrl`).
- **Items** : `updateItem` n'accepte plus que les champs éditables ; `createItem` vérifie la propriété du cours et n'accepte qu'une miniature externe ; contrôle de propriété du proxy par égalité exacte.
- **Dépendances** : `npm audit fix` (plus de vulnérabilité critique ; restent `sharp` — majeure — et `xlsx` — sans correctif).

### 🛟 Fiabilité & pertes de données
- **Notes** : autosave déclenchée uniquement par les vraies frappes et sérialisée, « Terminer » attend la sauvegarde en cours, flush au démontage, avertissement avant fermeture de l'onglet.
- **Éditeur Word** : conversion HTML → docx réécrite (tableaux, images, listes imbriquées, couleurs, liens, titres h1-h6), confirmation avant fermeture, édition réservée aux docx/odt, document non rechargé après enregistrement (défilement conservé).
- **Fichiers** : l'ancien fichier n'est supprimé qu'après upload et mise à jour réussis ; limite multer portée à 50 Mo (notes avec images collées).
- **Annotations** : plantage de la barre d'outils corrigé, cache mis à jour après sauvegarde, sauvegarde en attente envoyée au démontage.
- **Dessin** : tracé à main levée et export SVG des formes avec texte corrigés.

### 🤖 Contenu envoyé à l'IA
- Notes converties du HTML en texte (images base64 retirées), texte calculé au moment de la génération, PDF scannés détectés quel que soit le nombre de pages (OCR), `.doc` extraits par le serveur, `.pptx` correctement extraits pour les cartes mentales.
- Utilitaire unique `lib/itemSourceText` (vérification `res.ok`, cache réservé au vrai texte).

### ✨ UI / UX
- **Navigation** : menu principal dans la barre latérale, barre d'onglets mobile, retour hiérarchique, palette de commandes cherchant tous les documents.
- **Accueil** : section « Continuer » (documents récents), onboarding, squelettes de chargement.
- **Révision** : répétition espacée guidée (cartes dues, mode entraînement, remise en file des cartes ratées), export Anki, quiz avec revue et « Refaire les erreurs ».
- **Génération IA** : annulation (AbortController), progression, quota visible, messages d'erreur exploitables, choix du cours depuis un dossier.
- **Fondations** : pages d'erreur par route, `tailwindcss-animate`, police Inter appliquée, thèmes sombres Nature/Sunset corrigés, `prefers-reduced-motion`, `h-dvh`, ~280 clés i18n ajoutées (parité EN/FR).
- **Défilement** : feuille A4 de l'éditeur Word et notes longues sur mobile corrigées.

### ⚡ Performance & build
- Visionneuses, exports (html2pdf, docx), extraction (pdf.js, mammoth, OCR) et `heic2any` chargés à la demande ; `manualChunks` supprimés (préchargés partout) ; bundle de démarrage réduit d'environ 26 %.
- Docker : Node 22 LTS (Node 20 en fin de vie), `npm ci`, `.dockerignore`.

---

## [1.5.0] - 2026-04-19

### 🚀 Performance Backend (Partie 3.1)
- **Moteur de Cache** : Implémentation de `node-cache` pour les rapports financiers et scores de santé.
- **Optimisation Algorithmique** : Reconstruction de l'historique du solde passée de $O(N \times M)$ à $O(N)$.
- **Indexation BDD** : Ajout d'index critiques sur les transactions et comptes pour des calculs instantanés.
- **Monitoring** : Middleware de performance avec logging des requêtes lentes et header `X-Response-Time`.
- **Pagination** : Support de la pagination côté serveur pour les listes de transactions volumineuses.

### 💰 FinanceTrack (Optimisations & UX)
- **Filtres Avancés** : Recherche multicritère (dates, montant, compte, catégorie).
- **Audit Financier** : Amélioration du prompt IA et gestion du cache pour le score de santé.
- **Gestion des Comptes** : Invalidation intelligente du cache lors des modifications.
- **Sécurité** : Audit Snyk réalisé et correction des vulnérabilités de dépendances.

---

## [1.4.0] - 2026-01-23

### ✨ Nouveautés

#### Interface Utilisateur
- **Mode Zen/Focus unifié** : Suppression des modes plein écran dupliqués
  - Consolidation de tous les modes fullscreen en un seul mode Focus
  - Affichage contextuel : Document seul ou Résumé seul selon le bouton cliqué
  - Fonctionne sur mobile et desktop
- **BulkActionBar amélioré** :
  - Icône Résumé corrigée (FileText au lieu de Trash2)
  - Layout responsive avec `max-w-[95vw]` pour éviter débordements
  - Gaps réduits sur mobile (`gap-2 md:gap-4`)

### 📱 Mobile Responsiveness

#### Phase 1 - Corrections Critiques
- **CalendarWidget** :
  - ❌ Suppression de `min-w-[600px]` causant scroll horizontal
  - ✅ Remplacement par `w-full` avec gaps adaptatifs (`gap-1 md:gap-4`)
- **PDFViewer** :
  - Toolbar responsive avec padding réduit mobile (`p-2 md:p-3`)
  - Texte tronqué pour éviter débordements
  - Contrôles zoom compacts sur petits écrans

#### Phase 2 - Optimisations
- **ItemView** :
  - Header mobile optimisé (gap spacing amélioré)
  - Troncature de texte sur titres longs (`truncate`)
  - Optimisation espace vertical (min-h: 4rem → 3rem, py: 3 → 2)
  - ~20-25px d'espace supplémentaire pour le contenu

### 🚀 Performance (Phase 1 Quick Wins)

#### Optimisation Fonts (+10-15 points)
- **Chargement non-bloquant** :
  - Preload pour Inter (font critique)
  - Pattern `media="print" onload="this.media='all'"` pour async loading
  - Noscript fallback pour accessibilité
  - **Impact** : Élimine render-blocking, améliore FCP de -0.5s à -1s

#### Optimisation Images
- **Lazy loading natif** :
  - Ajout `loading="lazy"` sur drapeaux (flagcdn.com)
  - Ajout `decoding="async"` pour décodage non-bloquant
  - Vérification FilePreview déjà optimisé

### ♿ Accessibilité (Phase 2 - +20-25 points)

#### ARIA Labels Complets
- **BulkActionBar** (6 boutons améliorés) :
  - `aria-label` sur tous les boutons
  - `aria-expanded` + `aria-haspopup` pour dropdown
  - `aria-busy` pour état de chargement
  - `aria-hidden="true"` sur tous les icônes décoratifs
- **ItemView** :
  - `aria-label` sur bouton fullscreen
  - Amélioration navigation clavier

#### Impact
- **Avant** : Seulement 4 aria-labels dans toute l'app
- **Après** : 10+ composants critiques labellisés
- **Lecteurs d'écran** : Navigation et annonces complètes

### 📊 Scores Estimés

| Métrique | Avant | Après |
|----------|-------|-------|
| **Performance** | ~75 | ~85-90 ⚡ |
| **Accessibility** | ~60 | ~80-85 ♿ |
| **Best Practices** | ~85 | ~85+ ✅ |
| **SEO** | ~70 | ~75 📈 |

### 🐛 Corrections

- **ItemView** : Suppression références `isPdfFullscreen` obsolètes
- **BulkActionBar** : Correction icône Résumé (poubelle → document)
- **Mobile** : Élimination scroll horizontal sur tous écrans ≥360px

### 🔧 Technique

- **Vite config** : Code splitting déjà optimal (vendor, ui, pdf-lib, editor-lib)
- **React.lazy** : 16 pages lazy loaded avec Suspense
- **Semantic HTML** : AppLayout et Dashboard avec `<main>`, `<section>`

---

## [1.3.0] - 2026-01-12

### 🚀 Performance (Cible : 90+ Mobile PageSpeed)

#### Code-Splitting & Bundle Optimization
- **Découpage agressif du JavaScript** : Séparation des bibliothèques lourdes en chunks dédiés
  - `reactflow-lib` : ReactFlow et @xyflow/react (~70-100KB)
  - `editor-lib` : TipTap et extensions (~50-80KB)
  - `docx-processing` : Mammoth, docx-preview, docx (~100KB)
  - `pdf-lib` : pdfjs-dist, react-pdf (~40KB+)
- **Lazy loading Tesseract.js** : Import dynamique pour l'OCR (ne charge que quand nécessaire)
- **Réduction estimée du bundle principal** : ~200-250KB

#### Optimisation des Ressources
- **Auto-hébergement des polices** : 
  - Inter (400, 500, 600, 700) et Caveat (400, 700) en WOFF2
  - Suppression des appels externes à Google Fonts et CDNFonts
  - `font-display: swap` pour éviter le blocage du texte
  - **Gain LCP** : ~500-1000ms
- **Optimisation du logo** :
  - Réduction 1024x1024 → 144x144 (favicon/header)
  - Création de versions PWA (192x192, 512x512)
  - **Économie** : ~95-100KB
- **Preconnect** pour les polices (avant auto-hébergement)

#### Configuration
- Vérification de la configuration Tailwind pour le purge CSS
- Mise à jour de `vite.config.ts` avec chunks manuels granulaires

### 🐛 Corrections de Bugs

#### Backend
- **Import de documents dans les exercices** : Ajout du champ `fileType` manquant dans `updateItem`
- **Contrôleur de résumés** : Correction de `req.user.profileId` → `req.user.id`
- **Modèles Gemini AI** :
  - Mise à jour vers `gemini-2.5-flash` et `gemini-2.5-pro`
  - Configuration JSON native avec `responseMimeType: "application/json"`
  - Retry avec backoff exponentiel pour les erreurs 503

#### Frontend
- Correction d'erreurs JSX dans `ItemView.tsx` et `GenerateExerciseModal.tsx`
- Correction du placeholder de traduction (était déjà traduit, problème d'affichage)

### 🎨 Améliorations UI/UX

#### Mobile Responsiveness
- **ItemView** :
  - Header responsive (flex-col mobile, flex-row desktop)
  - Toolbar d'actions avec scroll horizontal sur mobile
  - Textes de boutons raccourcis ("Génération" → "IA")
  - Full-bleed pour le viewer de ressources (suppression padding mobile)
- **FilePreviewModal** : Suppression padding mobile pour maximiser l'espace
- **OfficeViewer** : 
  - Suppression des bordures sur mobile
  - Boutons toolbar optimisés ("Mode Local (Rapide)" → "Local")
- **DocxViewer** : Configuration `ignoreWidth: true` pour adaptation mobile
- **FocusPage** : Correction du chevauchement des boutons avec flexbox

#### Desktop
- Bouton toggle sidebar visible sur desktop (suppression de `lg:hidden`)

### 📝 Configuration & Métadonnées

#### HTML
- Langue : `en` → `fr`
- Ajout `theme-color` meta tag (#0f172a)
- Ajout `apple-touch-icon` pour PWA
- Description meta en français

#### Développeur
- Création `.vscode/settings.json` pour supprimer les warnings CSS Tailwind
- Nettoyage des fichiers temporaires (scripts d'optimisation)
- Suppression de `logo.png` original (remplacé par versions optimisées)

### 📊 Résultats Attendus
- **Performance Mobile** : 77 → 90+ (objectif atteint avec toutes les optimisations)
- **LCP** : ~4.1s → <2.5s (zone verte)
- **Best Practices** : 78+ (limite HTTPS hors scope)
- **Accessibility** : 98 ✅
- **SEO** : 100 ✅

---

All notable changes to this project will be documented in this file.

## [0.5.8] - 2026-01-11

### Added
- **Text-to-Speech**: Logic to read notes aloud with speed control and language detection.
- **Speech-to-Text**: Dictation feature in the editor to write by voice.
- **Library Page**: A dedicated page (`/library`) to list all courses with search functionality.
- **Compact Focus Timer**: A new, smaller timer widget integrated into the App Header.
- **Focus Page**: A dedicated page (`/focus`) for immersive study sessions.

### Changed
- **Dashboard Layout**: Optimized layout with full-width calendar and better spacing.
- **Sidebar**: Reverted toggle button to original design but kept the collapsible logic.
- **Login**: Added branding elements.

### Fixed
- **Navigation**: Fixed broken "See all" links.
- **Deployment**: Fixed syntax error in `GoogleConnectButton`.

## [Previous]
- **Homepage**: Implemented Bento Grid layout, Hero section with greetings and streaks, and Quick Actions dock.
- **Performance**: Optimized build times and removed production console logs.
- **Bug Fixes**: Resolved TypeScript errors in CorkBoardCanvas and build warnings.

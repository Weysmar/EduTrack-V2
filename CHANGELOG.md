# Changelog

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

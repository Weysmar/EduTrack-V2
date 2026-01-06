# Guide de Déploiement EduTrack V2 : GitHub & Dokploy

Ce guide détaille étape par étape comment versionner votre projet sur GitHub puis le déployer sur votre instance Dokploy en utilisant Docker Compose.

---

## 📋 Prérequis

1.  **Git** installé sur votre machine locale.
2.  Un compte **GitHub**.
3.  Une instance **Dokploy** fonctionnelle connectée à votre domaine (ou accessible via IP).
4.  Le connecteur GitHub configuré dans Dokploy (Settings -> Git Providers).

---

## 🚀 Étape 1 : Préparation et Push vers GitHub

### 1.1. Créer le fichier `.gitignore`
À la racine du projet (`EduTrack V2`), créez un fichier nommé `.gitignore` pour éviter d'envoyer des fichiers inutiles ou sensibles.

**Contenu de `.gitignore` :**
```gitignore
node_modules
dist
build
.env
.DS_Store
coverage
.vscode
.idea
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 1.2. Initialiser le dépôt Git
Ouvrez un terminal à la racine du projet (`EduTrack V2`) :

```bash
# Initialiser le dépôt
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit: EduTrack V2 Monorepo"
```

### 1.3. Créer le dépôt sur GitHub et Push
1.  Allez sur [GitHub.com/new](https://github.new).
2.  Créez un nouveau dépôt (ex: `edutrack-v2`).
3.  **Ne cochez pas** "Initialize with README" ou ".gitignore".
4.  Copiez les commandes proposées pour "push an existing repository..." :

```bash
git branch -M main
git remote add origin https://github.com/VOTRE_USER/edutrack-v2.git
git push -u origin main
```

---

## 🐳 Étape 2 : Déploiement sur Dokploy

### 2.1. Créer le Projet
1.  Connectez-vous à votre dashboard Dokploy (`http://VOTRE_IP:3000`).
2.  Cliquez sur **"Create Project"**.
3.  Nommez-le `edutrack-v2`.

### 2.2. Créer l'Application (Docker Compose)
1.  Dans le projet, cliquez sur **"Compose"**.
2.  Cliquez sur **"Create Service"**.
3.  Sélectionnez **"Git"** comme source.
    *   **Repository** : Sélectionnez `edutrack-v2` (si connecté) ou entrez l'URL.
    *   **Branch** : `main`.
    *   **Select Path** : `/` (racine, où se trouve `docker-compose.yml`).
4.  Cliquez sur **"Create"**.

### 2.3. Configuration de l'Environnement
Dans l'onglet **"Environment"** de votre service Compose :

Ajoutez les variables définies dans votre `docker-compose.yml` (remplacez les valeurs par les vôtres) :

```ini
# Base de données
POSTGRES_USER=edutrack
POSTGRES_PASSWORD=votre_mot_de_passe_securise
POSTGRES_DB=edutrack_db

# Backend
JWT_SECRET=super_secret_key_change_me
CORS_ORIGIN=http://VOTRE_IP_OU_DOMAINE

# Frontend
VITE_API_URL=http://VOTRE_IP_OU_DOMAINE:3000/api

# Stockage (Optionnel si local)
STORAGE_TYPE=local
```

### 2.4. Volumes (Persistance)
Dokploy gère automatiquement les volumes définis dans `docker-compose.yml`. Assurez-vous que les volumes sont bien listés dans l'onglet **"Volumes"** si besoin d'ajustements, mais la configuration par défaut du fichier est suffisante.

```yaml
volumes:
  postgres_data:
  uploads:
```

### 2.5. Déploiement
1.  Allez dans l'onglet **"Deployments"**.
2.  Cliquez sur **"Deploy"**.
3.  Suivez les logs pour vérifier que :
    *   L'image `postgres` est pullée.
    *   Le `backend` est buildé (npm install, build).
    *   Le `frontend` est buildé (npm install, build).
    *   Les conteneurs démarrent.

### 2.6. Configuration des Domaines (Exposition)
Pour rendre votre application accessible via un domaine (ou l'IP gérée par Dokploy), configurez les onglets **"Domains"**.
⚠️ **Important** : Ici, utilisez les ports **internes** des conteneurs (80 et 3000), pas les ports externes (8080 et 4000).

1.  Allez dans l'onglet **"Domains"**.
2.  **Frontend** :
    *   Service : `frontend`
    *   Container Port : `80` (Port interne Nginx)
    *   Domain : `edutrack.votre-domaine.com` (ou votre IP)
    *   Path : `/`
    *   Cliquez sur "Create".
3.  **Backend** :
    *   Service : `backend`
    *   Container Port : `3000` (Port interne Node.js)
    *   Domain : `api.edutrack.votre-domaine.com` (ou sous-chemin /api + IP)
    *   Path : `/`
    *   Cliquez sur "Create".

### 2.7. Initialisation de la Base de Données (Premier déploiement uniquement)
La base de données est initialement vide. Vous devez créer les tables manuellement via le Shell Dokploy :

1.  Allez dans le service **Backend** > onglet **Shell**.
2.  Sélectionnez le conteneur **backend** (pas frontend/nginx !) dans la liste déroulante.
3.  Connectez-vous (`/bin/sh`).
4.  Tapez les commandes suivantes :
    ```bash
    cd /app
    npx prisma db push
    ```
5.  Vous devez voir : `🚀 Your database is now in sync with your Prisma schema.`

---

## ✅ Étape 3 : Vérification

### 3.1. Accès Frontend
Ouvrez votre navigateur sur le domaine configuré (ex: `http://edutrack.votre-domaine.com` ou `http://VOTRE_IP:8080`).
*   Vous devriez voir la page de login d'EduTrack.

### 3.2. Test API
Ouvrez `http://api.edutrack.votre-domaine.com/health` (ou `http://VOTRE_IP:4000/health`).
*   Réponse attendue : `{"status":"ok", "timestamp":"..."}`.

### 3.3. Test Base de Données
Tentez de créer un compte utilisateur via le Frontend. Si cela fonctionne, la connexion PostgreSQL est opérationnelle.

---

## 🛠 Dépannage Courant

*   **Erreur de Build** : Vérifiez les logs dans Dokploy (onglet "Logs"). Souvent lié à une variable manquante.
*   **Erreur CORS** : Assurez-vous que `CORS_ORIGIN` dans l'environnement Backend correspond exactement à l'URL utilisée pour accéder au Frontend.
*   **Erreur de ports** : Si vous accédez via IP, n'oubliez pas que nous avons déplacé les ports sur **8080** (Front) et **4000** (Back) pour éviter les conflits.

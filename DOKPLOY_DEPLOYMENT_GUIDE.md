# 🚀 Guide Complet de Déploiement EduTrack-V2 sur Dokploy

**Version :** 2.0  
**Dernière mise à jour :** Février 2026  
**Auteur :** Vincent (Weysmar)

---

## 📋 Table des Matières

1. [Vue d'Ensemble du Projet](#vue-densemble-du-projet)
2. [Prérequis](#prérequis)
3. [Architecture de Déploiement](#architecture-de-déploiement)
4. [Configuration du Projet](#configuration-du-projet)
5. [Déploiement sur Dokploy](#déploiement-sur-dokploy)
6. [Configuration Post-Déploiement](#configuration-post-déploiement)
7. [Vérification et Tests](#vérification-et-tests)
8. [Maintenance et Mises à Jour](#maintenance-et-mises-à-jour)
9. [Dépannage](#dépannage)

---

## 📊 Vue d'Ensemble du Projet

EduTrack V2 est une plateforme LMS (Learning Management System) moderne composée de :

### Stack Technique

| Composant | Technologie | Description |
|-----------|-------------|-------------|
| **Frontend** | React 18 + TypeScript + Vite | Interface utilisateur réactive |
| **Backend** | Node.js 20 + Express + TypeScript | API REST |
| **Base de données** | PostgreSQL 15 | Stockage relationnel |
| **ORM** | Prisma 5.7 | Gestion de la base de données |
| **Stockage** | MinIO (S3-compatible) | Stockage de fichiers |
| **IA** | Google Gemini API | Génération de contenu |
| **Temps réel** | Socket.IO | Collaboration en temps réel |

### Fonctionnalités Principales

- 📚 Gestion de cours avec éditeur WYSIWYG (Tiptap)
- 📄 Upload et traitement de documents (PDF, DOCX, images)
- 🤖 Génération IA (flashcards, QCM, résumés, mind maps)
- 👥 Édition collaborative temps réel (Yjs)
- 📊 Analytics et suivi de progression
- 📱 Interface responsive et PWA

---

## ✅ Prérequis

### Serveur

- **Dokploy** installé et configuré
- Accès au tableau de bord Dokploy (ex: `https://dokploy.votre-domaine.com`)
- Nom de domaine configuré (optionnel mais recommandé)
- Minimum 2 GB RAM, 2 CPU cores, 20 GB stockage

### Clés API Requises

| Service | Utilisation | Obtention |
|---------|-------------|-----------|
| **Google Gemini API** | Génération de contenu IA | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| **JWT Secret** | Authentification | Générer aléatoirement (32+ caractères) |

### Accès Repository

- Repository GitHub : `https://github.com/Weysmar/EduTrack-V2`
- Branche principale : `main`

---

## 🏗️ Architecture de Déploiement

```mermaid
graph TB
    subgraph Internet
        U[Utilisateurs]
    end
    
    subgraph Dokploy["Serveur Dokploy"]
        RP[Reverse Proxy + SSL<br/>Traefik/Nginx]
        
        subgraph Frontend["Container Frontend"]
            F[Nginx<br/>React App]
        end
        
        subgraph Backend["Container Backend"]
            B[Node.js + Express<br/>Port 3000]
        end
        
        subgraph Database["Container PostgreSQL"]
            DB[(PostgreSQL 15<br/>Port 5432)]
        end
        
        subgraph Storage["Container MinIO"]
            S[MinIO S3<br/>Port 9000/9001]
        end
    end
    
    U -->|HTTPS| RP
    RP -->|/| F
    RP -->|/api/*| B
    F -.->|API Calls| B
    B -->|Prisma ORM| DB
    B -->|Upload Files| S
    B -.->|Gemini API| GEM[Google Gemini]
    
    style F fill:#61dafb,stroke:#333,stroke-width:2px
    style B fill:#68a063,stroke:#333,stroke-width:2px
    style DB fill:#336791,stroke:#333,stroke-width:2px
    style S fill:#c72c48,stroke:#333,stroke-width:2px
```

### Flux de Données

1. **Utilisateur** → Accède à l'application via HTTPS
2. **Reverse Proxy** → Route les requêtes vers frontend ou backend
3. **Frontend** → Serveur statique Nginx avec React build
4. **Backend** → API REST qui communique avec PostgreSQL et MinIO
5. **PostgreSQL** → Stocke toutes les données structurées
6. **MinIO** → Stocke les fichiers uploadés (PDF, images, etc.)

---

## 🔧 Configuration du Projet

> [!NOTE]
> Les Dockerfiles sont déjà présents dans le repository. Cette section détaille leur contenu pour votre compréhension.

### Backend Dockerfile

Le fichier [server/Dockerfile](file:///c:/Users/Vincent/.gemini/antigravity/scratch/EduTrack-V2/server/Dockerfile) configure :

- **Image de base** : `node:20-slim`
- **Dépendances système** : OpenSSL, LibreOffice (conversion de documents)
- **Build** : Compilation TypeScript → JavaScript
- **Prisma** : Génération du client ORM
- **Port exposé** : 3000
- **Commande de démarrage** : `npm start` (applique les migrations puis démarre le serveur)

### Frontend Dockerfile

Le fichier [client/Dockerfile](file:///c:/Users/Vincent/.gemini/antigravity/scratch/EduTrack-V2/client/Dockerfile) configure :

- **Build multi-stage** : 
  - Stage 1: Build React avec Node 20
  - Stage 2: Serveur Nginx Alpine (léger)
- **Variables d'environnement** : `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`
- **Configuration Nginx** : Reverse proxy pour `/api/*`, gestion SPA avec `try_files`
- **Port exposé** : 80

### Configuration Nginx

Le fichier [client/nginx.conf](file:///c:/Users/Vincent/.gemini/antigravity/scratch/EduTrack-V2/client/nginx.conf) gère :

- **Proxy API** : `/api/*` → backend:3000
- **WebSocket** : `/socket.io` → backend pour temps réel
- **Compression** : Gzip activé pour performances
- **Cache** : Assets statiques (1 an), pas de cache pour `index.html`
- **Upload** : Support fichiers jusqu'à 200 MB

> [!IMPORTANT]
> Le `nginx.conf` contient actuellement des IPs hardcodées (`192.168.1.63:3001`). Sur Dokploy, il faudra utiliser les noms de service Docker.

---

## 🚀 Déploiement sur Dokploy

### Étape 1 : Créer la Base de Données PostgreSQL

1. **Connectez-vous au tableau de bord Dokploy**

2. **Naviguez vers Databases** → **Create Database**

3. **Configurez PostgreSQL** :
   ```yaml
   Name: edutrack-postgres
   Database: edutrack_db
   Username: edutrack_user
   Password: [Générer un mot de passe fort]
   Version: 15-alpine
   ```

4. **Notez l'URL de connexion** affichée :
   ```
   postgresql://edutrack_user:votre_password@edutrack-postgres:5432/edutrack_db
   ```

> [!TIP]
> Utilisez un gestionnaire de mots de passe pour sauvegarder ces informations de manière sécurisée.

---

### Étape 2 : Créer le Service MinIO (Stockage S3)

1. **Naviguez vers Applications** → **Create Application**

2. **Sélectionnez Docker Compose** ou **Docker Image**

3. **Configurez MinIO** :
   ```yaml
   Name: edutrack-minio
   Image: minio/minio:latest
   Command: server /data --console-address ":9001"
   Ports:
     - 9000:9000 (API S3)
     - 9001:9001 (Console Web)
   Environment Variables:
     MINIO_ROOT_USER: minioadmin
     MINIO_ROOT_PASSWORD: [Mot de passe fort 12+ caractères]
   Volumes:
     - /data (persistent storage)
   ```

4. **Déployez et attendez que le conteneur soit actif**

5. **Accédez à la console MinIO** via `http://votre-serveur:9001`

6. **Créez un bucket pour EduTrack** :
   - Nom du bucket : `edutrack-uploads`
   - Politique d'accès : **Private** (par défaut)

7. **Créez des Access Keys** :
   - Allez dans **Access Keys** → **Create New Access Key**
   - Notez l'**Access Key** et la **Secret Key**

---

### Étape 3 : Déployer le Backend

1. **Naviguez vers Applications** → **Create Application**

2. **Sélectionnez Git Repository**

3. **Configurez le repository** :
   ```yaml
   Name: edutrack-backend
   Repository URL: https://github.com/Weysmar/EduTrack-V2
   Branch: main
   Build Context: ./server
   Dockerfile Path: server/Dockerfile
   ```

4. **Configurez les Variables d'Environnement** :

   ```bash
   # Database
   DATABASE_URL=postgresql://edutrack_user:VOTRE_PASSWORD@edutrack-postgres:5432/edutrack_db
   
   # JWT Authentication
   JWT_SECRET=GENERER_UNE_CLE_ALEATOIRE_MINIMUM_32_CARACTERES
   
   # Google Gemini AI
   GEMINI_API_KEY=VOTRE_CLE_API_GEMINI_ICI
   
   # Server Configuration
   NODE_ENV=production
   PORT=3000
   
   # Storage Configuration (MinIO)
   STORAGE_TYPE=s3
   AWS_ACCESS_KEY_ID=VOTRE_MINIO_ACCESS_KEY
   AWS_SECRET_ACCESS_KEY=VOTRE_MINIO_SECRET_KEY
   AWS_REGION=us-east-1
   AWS_BUCKET_NAME=edutrack-uploads
   AWS_ENDPOINT=http://edutrack-minio:9000
   
   # CORS (ajuster selon votre domaine)
   CORS_ORIGIN=https://votre-domaine.com
   ```

   > [!WARNING]
   > Remplacez **TOUS** les placeholders par vos vraies valeurs. Ne laissez pas de valeurs par défaut en production !

5. **Configurez les Volumes** (optionnel si MinIO utilisé) :
   - Path : `/app/uploads`
   - Type : **Persistent Volume**

6. **Configurez le Port** :
   - Internal Port : `3000`
   - External Port : Laisser Dokploy gérer

7. **Cliquez sur Deploy** et attendez la fin du build

---

### Étape 4 : Configurer le Domaine Backend

1. **Ouvrez l'application edutrack-backend**

2. **Naviguez vers Domains** → **Add Domain**

3. **Configurez le domaine** :
   ```yaml
   Domain: api.votre-domaine.com
   Path: /api
   Enable SSL: ✓ (Let's Encrypt)
   Force HTTPS: ✓
   ```

4. **Sauvegardez et attendez la génération du certificat SSL**

5. **Notez l'URL complète du backend** : `https://api.votre-domaine.com/api`

---

### Étape 5 : Déployer le Frontend

1. **Naviguez vers Applications** → **Create Application**

2. **Sélectionnez Git Repository**

3. **Configurez le repository** :
   ```yaml
   Name: edutrack-frontend
   Repository URL: https://github.com/Weysmar/EduTrack-V2
   Branch: main
   Build Context: ./client
   Dockerfile Path: client/Dockerfile
   ```

4. **Configurez les Build Arguments** :
   ```bash
   VITE_API_URL=https://api.votre-domaine.com/api
   VITE_GOOGLE_CLIENT_ID=VOTRE_GOOGLE_CLIENT_ID_SI_OAUTH_ACTIVE
   ```

   > [!NOTE]
   > Les build arguments sont injectés **pendant le build** du frontend. Si vous changez ces valeurs, il faudra redéployer.

5. **Configurez le Port** :
   - Internal Port : `80`

6. **Cliquez sur Deploy**

---

### Étape 6 : Configurer le Domaine Frontend

1. **Ouvrez l'application edutrack-frontend**

2. **Naviguez vers Domains** → **Add Domain**

3. **Configurez le domaine** :
   ```yaml
   Domain: votre-domaine.com
   Enable SSL: ✓
   Force HTTPS: ✓
   ```

4. **Sauvegardez**

---

### Étape 7 : Corriger la Configuration Nginx

> [!IMPORTANT]
> Le fichier `nginx.conf` actuel a des IPs hardcodées qui ne fonctionneront pas sur Dokploy.

**Option A : Utiliser une variable d'environnement (recommandé)**

1. Modifiez `client/nginx.conf` pour utiliser une variable :
   ```nginx
   location /api/ {
       proxy_pass ${BACKEND_URL}/api/;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

2. Dans Dokploy, ajoutez la variable d'environnement au frontend :
   ```bash
   BACKEND_URL=http://edutrack-backend:3000
   ```

**Option B : Modification directe (plus simple)**

1. Clonez le repository localement
2. Remplacez toutes les occurrences de `192.168.1.63:3001` par `edutrack-backend:3000` dans `client/nginx.conf`
3. Committez et poussez sur GitHub
4. Redéployez le frontend sur Dokploy

---

## 🔍 Configuration Post-Déploiement

### Vérifier les Migrations de Base de Données

1. **Accédez aux logs du backend** dans Dokploy

2. **Vérifiez que les migrations Prisma se sont exécutées** :
   ```
   ✓ Prisma schema loaded
   ✓ Database connection established
   ✓ Migrations applied successfully
   ```

3. **Si nécessaire, exécutez manuellement** :
   ```bash
   # Via console Dokploy dans le conteneur backend
   npx prisma db push --accept-data-loss
   ```

### Configurer CORS

Si vous rencontrez des erreurs CORS :

1. **Modifiez la variable d'environnement du backend** :
   ```bash
   CORS_ORIGIN=https://votre-domaine.com,https://www.votre-domaine.com
   ```

2. **Redémarrez le backend**

### Configurer les Webhooks (Optionnel)

Pour le déploiement automatique :

1. **Dans Dokploy, récupérez l'URL du webhook**
2. **Sur GitHub** : Settings → Webhooks → Add webhook
3. **Collez l'URL Dokploy**
4. **Sélectionnez les événements** : `push` sur `main`

---

## ✅ Vérification et Tests

### 1️⃣ Tester le Backend

**Vérifier le health check** :

```bash
curl https://api.votre-domaine.com/api/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T16:00:00.000Z"
}
```

**Vérifier la connexion à la base de données** :

```bash
curl https://api.votre-domaine.com/api/profiles
```

### 2️⃣ Tester le Frontend

1. **Accédez à** `https://votre-domaine.com`

2. **Vérifiez que la page charge sans erreurs 404**

3. **Ouvrez la console développeur** (F12) :
   - Onglet **Console** : Pas d'erreurs rouges critiques
   - Onglet **Network** : Requêtes API réussies (statut 200/201)

### 3️⃣ Tester l'Upload de Fichiers

1. **Créez un compte utilisateur**

2. **Créez un cours**

3. **Uploadez un fichier** (PDF, image, DOCX)

4. **Vérifiez dans MinIO** :
   - Connectez-vous à la console MinIO (`http://votre-serveur:9001`)
   - Bucket `edutrack-uploads` doit contenir le fichier

### 4️⃣ Tester la Génération IA

1. **Créez une note avec du texte**

2. **Générez des flashcards** depuis la note

3. **Vérifiez les logs du backend** pour les appels à Gemini API

> [!CAUTION]
> Si la génération IA échoue, vérifiez que `GEMINI_API_KEY` est correcte et que votre quota API n'est pas dépassé.

---

## 🔄 Maintenance et Mises à Jour

### Déploiement d'une Nouvelle Version

**Méthode Automatique (avec webhook GitHub)** :

1. Poussez vos modifications sur `main`
2. Dokploy redéploie automatiquement

**Méthode Manuelle** :

1. Allez dans Dokploy → Applications
2. Sélectionnez `edutrack-backend` ou `edutrack-frontend`
3. Cliquez sur **Redeploy**

### Sauvegardes

**Base de données PostgreSQL** :

```bash
# Backup manuel
docker exec edutrack-postgres pg_dump -U edutrack_user edutrack_db > backup.sql

# Restauration
docker exec -i edutrack-postgres psql -U edutrack_user edutrack_db < backup.sql
```

**MinIO (fichiers)** :

Utilisez l'outil [mc (MinIO Client)](https://docs.min.io/docs/minio-client-quickstart-guide.html) :

```bash
mc mirror edutrack-minio/edutrack-uploads ./backup-uploads
```

### Mise à Jour des Dépendances

1. Localement, mettez à jour `package.json`
2. Testez en local
3. Committez et poussez
4. Redéployez sur Dokploy

---

## 🐛 Dépannage

### ❌ Erreur "Cannot connect to database"

**Cause** : Le backend ne peut pas atteindre PostgreSQL

**Solutions** :
1. Vérifiez que `DATABASE_URL` contient le bon nom de conteneur (`edutrack-postgres`)
2. Vérifiez que les containers sont sur le même réseau Docker
3. Redémarrez le conteneur backend

### ❌ Erreur CORS

**Symptôme** : Console affiche `blocked by CORS policy`

**Solutions** :
1. Vérifiez `CORS_ORIGIN` dans les variables d'environnement du backend
2. Ajoutez votre domaine exact (pas de trailing slash)
3. Redémarrez le backend

### ❌ Fichiers non uploadés

**Cause** : MinIO non accessible ou mal configuré

**Solutions** :
1. Vérifiez les variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT`
2. Testez la connexion MinIO : `curl http://edutrack-minio:9000/health/ready`
3. Vérifiez que le bucket existe et est accessible

### ❌ Erreur 502 Bad Gateway

**Cause** : Le backend ne répond pas

**Solutions** :
1. Vérifiez les logs du backend dans Dokploy
2. Vérifiez que le container est démarré (`docker ps`)
3. Vérifiez que le port 3000 est bien exposé

### ❌ Build Frontend échoue

**Erreur courante** : `MODULE_NOT_FOUND` ou `ENOENT`

**Solutions** :
1. Vérifiez que `package.json` et `package-lock.json` sont committés
2. Videz le cache Docker : Settings → Builder → Clean cache
3. Utilisez `--legacy-peer-deps` dans le Dockerfile si conflit de dépendances

### ❌ Migrations Prisma échouent

**Solutions** :
1. Exécutez manuellement dans le conteneur :
   ```bash
   docker exec -it edutrack-backend npx prisma db push --accept-data-loss
   ```
2. Vérifiez que `DATABASE_URL` est correcte
3. Vérifiez que PostgreSQL est accessible

---

## 📞 Support et Ressources

### Documentation Officielle

- [Dokploy Docs](https://docs.dokploy.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [MinIO Docs](https://docs.min.io)
- [Nginx Docs](https://nginx.org/en/docs/)

### Repository

- **GitHub** : [Weysmar/EduTrack-V2](https://github.com/Weysmar/EduTrack-V2)
- **Issues** : Signalez les bugs sur GitHub Issues

### Communauté

- Discord Dokploy (voir la documentation officielle)
- Stack Overflow avec tags `docker`, `nginx`, `prisma`

---

## 📝 Checklist Finale de Déploiement

Avant de considérer le déploiement comme terminé, vérifiez :

- [ ] PostgreSQL démarré et accessible
- [ ] MinIO démarré avec bucket créé
- [ ] Backend déployé avec toutes les variables d'environnement
- [ ] Frontend déployé avec `VITE_API_URL` correcte
- [ ] Domaines configurés avec SSL actif
- [ ] Test de création de compte réussi
- [ ] Test d'upload de fichier réussi
- [ ] Test de génération IA réussi
- [ ] Sauvegardes configurées (base de données + fichiers)
- [ ] Monitoring des logs activé
- [ ] Documentation des credentials sécurisée

---

**🎉 Félicitations ! EduTrack-V2 est maintenant déployé sur Dokploy !**

Pour toute question ou problème, consultez la section [Dépannage](#dépannage) ou créez une issue sur GitHub.

---

*Document généré le 3 février 2026 - Version 2.0*

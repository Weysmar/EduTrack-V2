# Guide de Déploiement - EduTrack V2 sur Dokploy

Ce guide explique comment déployer le projet EduTrack V2 sur un serveur utilisant **Dokploy**.

---

## Prérequis

- Un serveur avec Dokploy installé et configuré
- Accès au tableau de bord Dokploy (ex: `https://dokploy.votre-serveur.com`)
- Accès au repository GitHub : `https://github.com/Weysmar/EduTrack-V2`

---

## 1. Préparer les Fichiers de Configuration

### A. Créer le Dockerfile pour le Backend

Créer le fichier `server/Dockerfile` :

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Exposer le port
EXPOSE 5000

# Démarrer l'application
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```

### B. Créer le Dockerfile pour le Frontend

Créer le fichier `client/Dockerfile` :

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Build de production
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine

# Copier le build
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration Nginx personnalisée
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### C. Mettre à Jour la Configuration du Client

Modifier le fichier `client/src/config.ts` pour utiliser une variable d'environnement :

```typescript
export const API_URL = import.meta.env.VITE_API_URL || '/api'
```

---

## 2. Committer les Fichiers Docker

```bash
# Sur votre machine locale
cd "c:/Users/Vincent/Desktop/EduTrack V2"

# Ajouter les Dockerfiles
git add server/Dockerfile client/Dockerfile client/src/config.ts
git commit -m "feat: add Dockerfiles for Dokploy deployment"
git push origin main
```

---

## 3. Déploiement sur Dokploy

### A. Créer la Base de Données PostgreSQL

1. Connectez-vous au tableau de bord Dokploy
2. Allez dans **Databases**
3. Cliquez sur **Create Database**
4. Sélectionnez **PostgreSQL**
5. Configurez :
   - **Name** : `edutrack-db`
   - **Database** : `edutrack`
   - **Username** : `edutrack_user`
   - **Password** : Générer un mot de passe sécurisé
6. Cliquez sur **Create**
7. **Notez l'URL de connexion** affichée (format : `postgresql://user:password@host:5432/database`)

### B. Déployer le Backend

1. Allez dans **Applications**
2. Cliquez sur **Create Application**
3. Sélectionnez **Git Repository**
4. Configurez :
   - **Name** : `edutrack-backend`
   - **Repository URL** : `https://github.com/Weysmar/EduTrack-V2`
   - **Branch** : `main`
   - **Build Path** : `server`
   - **Dockerfile Path** : `server/Dockerfile`
   - **Port** : `5000`

5. **Variables d'environnement** (section Environment) :
   ```
   DATABASE_URL=postgresql://edutrack_user:password@edutrack-db:5432/edutrack
   JWT_SECRET=votre_secret_jwt_genere
   GEMINI_API_KEY=votre_cle_gemini
   PORT=5000
   NODE_ENV=production
   UPLOAD_DIR=uploads
   STORAGE_TYPE=local
   ```

   > **Astuce** : Pour `DATABASE_URL`, utilisez l'URL fournie lors de la création de la base de données

6. **Volumes** (pour persister les fichiers uploadés) :
   - Path : `/app/uploads`
   - Type : **Volume**

7. Cliquez sur **Deploy**

### C. Déployer le Frontend

1. Retournez dans **Applications**
2. Cliquez sur **Create Application**
3. Sélectionnez **Git Repository**
4. Configurez :
   - **Name** : `edutrack-frontend`
   - **Repository URL** : `https://github.com/Weysmar/EduTrack-V2`
   - **Branch** : `main`
   - **Build Path** : `client`
   - **Dockerfile Path** : `client/Dockerfile`
   - **Port** : `80`

5. **Build Arguments** :
   ```
   VITE_API_URL=https://votre-domaine.com/api
   ```
   > Remplacez par l'URL réelle du backend (voir étape suivante)

6. Cliquez sur **Deploy**

### D. Configurer le Reverse Proxy et SSL

#### Pour le Backend :

1. Ouvrez l'application **edutrack-backend**
2. Allez dans **Domains**
3. Ajoutez un domaine :
   - **Domain** : `api.votre-domaine.com` (ou utilisez un sous-chemin)
   - **Path** : `/api` (si vous utilisez le même domaine que le frontend)
   - **Enable SSL** : ✓ (Dokploy gère automatiquement Let's Encrypt)

#### Pour le Frontend :

1. Ouvrez l'application **edutrack-frontend**
2. Allez dans **Domains**
3. Ajoutez un domaine :
   - **Domain** : `votre-domaine.com`
   - **Enable SSL** : ✓

### E. Redéployer le Frontend avec la Bonne URL

Une fois que vous connaissez l'URL du backend (ex: `https://votre-domaine.com/api`), retournez dans l'application frontend :

1. Allez dans **Settings** → **Build Arguments**
2. Mettez à jour `VITE_API_URL` avec l'URL correcte
3. Cliquez sur **Redeploy**

---

## 4. Vérifications Post-Déploiement

### A. Vérifier les Logs

1. **Backend** :
   - Ouvrez l'application **edutrack-backend**
   - Allez dans **Logs**
   - Vérifiez qu'il n'y a pas d'erreurs de connexion à la base de données

2. **Frontend** :
   - Ouvrez l'application **edutrack-frontend**
   - Vérifiez que le build s'est terminé avec succès

### B. Tester l'Application

1. Accédez à `https://votre-domaine.com`
2. Essayez de créer un compte
3. Uploadez un fichier de test
4. Vérifiez que tout fonctionne correctement

---

## 5. Mises à Jour Futures

Lorsque vous poussez des modifications sur GitHub :

1. Sur Dokploy, ouvrez l'application concernée (backend ou frontend)
2. Cliquez sur **Redeploy**
3. Dokploy récupérera automatiquement les dernières modifications

**Ou configurez le déploiement automatique** :

1. Dans les paramètres de l'application
2. Activez **Auto Deploy on Git Push**
3. Configurez le webhook sur GitHub

---

## 6. Gestion de la Base de Données

### Accès à Prisma Studio (si besoin)

Pour gérer visuellement la base de données :

1. Utilisez un tunnel SSH vers le serveur Dokploy
2. Connectez-vous au conteneur du backend :
   ```bash
   docker exec -it edutrack-backend sh
   npx prisma studio
   ```
3. Accédez à `http://localhost:5555` via le tunnel

### Migrations

Les migrations sont automatiquement exécutées au démarrage du conteneur backend grâce à la commande dans le Dockerfile :
```
npx prisma migrate deploy
```

---

## 7. Architecture du Déploiement

```
┌─────────────────────────────────────────┐
│           Dokploy Dashboard             │
│  (Gestion centralisée + SSL auto)       │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼─────────┐
│   Frontend     │    │    Backend       │
│   (Nginx)      │    │   (Node.js)      │
│   Port: 80     │    │   Port: 5000     │
└────────────────┘    └──────────┬───────┘
                                 │
                        ┌────────▼─────────┐
                        │   PostgreSQL     │
                        │   Port: 5432     │
                        └──────────────────┘
```

---

## 8. Dépannage

### Erreur de connexion à la base de données

- Vérifiez que `DATABASE_URL` est correctement configurée
- Vérifiez que le conteneur de la base de données est démarré
- Utilisez le nom du conteneur (`edutrack-db`) comme host, pas `localhost`

### L'API ne répond pas

- Vérifiez les logs du backend dans Dokploy
- Vérifiez que le port 5000 est bien exposé
- Vérifiez que le reverse proxy est correctement configuré

### Les fichiers uploadés disparaissent après un redéploiement

- Assurez-vous que le volume `/app/uploads` est bien configuré
- Vérifiez que le volume est persistant (pas éphémère)

---

## Support

Pour toute question :
- Documentation Dokploy : https://docs.dokploy.com
- Repository GitHub : https://github.com/Weysmar/EduTrack-V2

---

**Auteur** : Vincent (Weysmar)  
**Date** : Janvier 2026  
**Version** : 2.0 - Dokploy Edition

# Plan d'Implémentation - EduTrack V2 Cloud-First (Dokploy)

Migration d'une application client-side (Dexie/IndexedDB) vers une architecture cloud-first avec PostgreSQL, backend API, et déploiement Dokploy sur serveur local.

---

## User Review Required

> [!IMPORTANT]
> **Architecture Cloud-First** : Le projet existant utilise **Dexie (IndexedDB)** pour stockage local. La migration implique une refonte complète de la persistance vers **PostgreSQL** avec API REST. Toutes les données existantes seront perdues sauf export manuel préalable.

> [!WARNING]
> **Breakpoints de synchronisation** : La synchronisation temps réel sera implémentée via **WebSocket** (Socket.io). Alternative : polling HTTP toutes les 3 secondes. Choisir selon la complexité souhaitée.

> [!CAUTION]
> **Stockage fichiers** : Deux options pour les PDFs/ressources :
> - **Option A** : S3-compatible (MinIO sur Dokploy) - Production-ready
> - **Option B** : Stockage filesystem local - Plus simple, moins scalable
> 
> Quelle option préférez-vous ?

---

## Proposed Changes

### Backend (Nouveau)

#### [NEW] [package.json](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/package.json)

Nouveau service backend Node.js/Express avec :

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.2.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "socket.io": "^4.8.0",
    "multer": "^1.4.5-lts.1",
    "aws-sdk": "^2.1500.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  }
}
```

**Technologies** :
- **Express** : API REST
- **Prisma** : ORM pour PostgreSQL
- **JWT** : Authentication
- **Socket.io** : Synchronisation temps réel
- **Multer** : Upload fichiers
- **AWS SDK** : Storage S3-compatible (ou filesystem)

---

#### [NEW] [schema.prisma](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/prisma/schema.prisma)

Schéma PostgreSQL basé sur `db.ts` existant :

```prisma
model Profile {
  id           String   @id @default(uuid())
  name         String
  email        String?  @unique
  passwordHash String?
  avatar       String?
  theme        String   @default("dark")
  language     String   @default("fr")
  createdAt    DateTime @default(now())
  lastAccessed DateTime @updatedAt
  
  courses    Course[]
  folders    Folder[]
  items      Item[]
  flashcards FlashcardSet[]
  quizzes    Quiz[]
}

model Course {
  id          String   @id @default(uuid())
  profileId   String
  title       String
  description String
  color       String
  icon        String?
  folderId    String?
  isFavorite  Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  folder  Folder? @relation(fields: [folderId], references: [id])
  items   Item[]
}

model Folder {
  id        String   @id @default(uuid())
  profileId String
  name      String
  parentId  String?
  createdAt DateTime @default(now())
  
  profile  Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  parent   Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children Folder[] @relation("FolderHierarchy")
  courses  Course[]
}

model Item {
  id               String   @id @default(uuid())
  profileId        String
  courseId         String
  type             String   // 'note' | 'exercise' | 'resource'
  title            String
  content          String?  @db.Text
  fileUrl          String?
  fileName         String?
  fileSize         Int?
  storageKey       String?  // S3 key
  status           String?
  difficulty       String?
  tags             String[]
  extractedContent String?  @db.Text
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  course  Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)
}

model FlashcardSet {
  id          String   @id @default(uuid())
  profileId   String
  courseId    String?
  itemId      String?
  name        String
  description String?
  count       Int      @default(0)
  mastered    Int      @default(0)
  createdAt   DateTime @default(now())
  
  profile    Profile     @relation(fields: [profileId], references: [id], onDelete: Cascade)
  flashcards Flashcard[]
}

model Flashcard {
  id           String   @id @default(uuid())
  setId        String
  front        String   @db.Text
  back         String   @db.Text
  nextReview   DateTime
  interval     Int      @default(1)
  easeFactor   Float    @default(2.5)
  createdAt    DateTime @default(now())
  lastReviewed DateTime?
  
  set FlashcardSet @relation(fields: [setId], references: [id], onDelete: Cascade)
}

model Quiz {
  id            String   @id @default(uuid())
  profileId     String
  courseId      String?
  name          String
  difficulty    String
  questionCount Int
  bestScore     Int?
  createdAt     DateTime @default(now())
  
  profile   Profile        @relation(fields: [profileId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
}

model QuizQuestion {
  id            String   @id @default(uuid())
  quizId        String
  stem          String   @db.Text
  options       String[]
  correctAnswer Int
  explanation   String   @db.Text
  
  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
}
```

**Adaptations** :
- UUIDs pour toutes les clés primaires (cloud-first)
- Relations Cascade pour intégrité référentielle
- `@db.Text` pour contenus longs
- Array PostgreSQL pour tags/options

---

#### [NEW] [routes/auth.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/src/routes/auth.ts)

```typescript
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me (Protected)
POST /api/auth/logout
```

**Fonctionnalités** :
- Hachage bcrypt
- Tokens JWT (24h expiration)
- Middleware `authenticate` pour routes protégées

---

#### [NEW] [routes/courses.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/src/routes/courses.ts)

```typescript
GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PUT    /api/courses/:id
DELETE /api/courses/:id
```

Filtrage automatique par `profileId` via JWT.

---

#### [NEW] [routes/items.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/src/routes/items.ts)

```typescript
GET    /api/items?courseId=xxx
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id
POST   /api/items/:id/upload (Multipart)
```

**Upload** :
- `multer` pour multipart/form-data
- Validation taille max 100MB (PDFs lourds)
- Upload vers S3 ou `/uploads` local
- Génération URL presigned (S3) ou URL publique

---

#### [NEW] [services/socket.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/src/services/socket.ts)

Synchronisation temps réel :

```typescript
io.on('connection', (socket) => {
  socket.on('join-profile', (profileId) => {
    socket.join(`profile:${profileId}`);
  });
});

// Emit après mutation BDD
io.to(`profile:${profileId}`).emit('course-updated', course);
```

**Événements** :
- `course-created/updated/deleted`
- `item-created/updated/deleted`
- `flashcard-updated`

---

### Frontend (Modifications)

#### [MODIFY] [src/lib/api/client.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/client/src/lib/api/client.ts)

Créer client HTTP Axios avec :
- Base URL depuis `VITE_API_URL`
- Interceptor JWT (stocké en localStorage)
- Gestion erreurs 401 (redirect `/auth`)

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

#### [MODIFY] [src/store/authStore.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/client/src/store/authStore.ts)

Remplacer logique IndexedDB par API :

```typescript
const authStore = create<AuthStore>((set) => ({
  user: null,
  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('jwt_token', data.token);
    set({ user: data.profile });
  },
  logout: () => {
    localStorage.removeItem('jwt_token');
    set({ user: null });
  }
}));
```

---

#### [DELETE] [src/db/db.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/client/src/db/db.ts)

Supprimer entièrement Dexie. Toutes les requêtes passent par API.

---

#### [MODIFY] [src/pages/CourseView.tsx](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/client/src/pages/CourseView.tsx)

Exemple de migration :

**Avant** :
```typescript
const courses = await db.courses.toArray();
```

**Après** :
```typescript
const { data: courses } = await apiClient.get('/courses');
```

Appliquer ce pattern à toutes les pages.

---

#### [NEW] [src/hooks/useSocket.ts](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/client/src/hooks/useSocket.ts)

Hook React pour synchronisation :

```typescript
import { io } from 'socket.io-client';

export const useSocket = () => {
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    const profileId = authStore.getState().user?.id;
    
    socket.emit('join-profile', profileId);
    
    socket.on('course-updated', (course) => {
      // Rafraîchir store Zustand
      courseStore.getState().updateCourse(course);
    });
    
    return () => socket.disconnect();
  }, []);
};
```

---

### Dokploy Configuration

#### [NEW] [docker-compose.yml](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/docker-compose.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: edutrack
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: edutrack_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./server
    environment:
      DATABASE_URL: postgresql://edutrack:${DB_PASSWORD}@postgres:5432/edutrack_db
      JWT_SECRET: ${JWT_SECRET}
      AWS_ACCESS_KEY: ${AWS_ACCESS_KEY}  # Si S3
      AWS_SECRET_KEY: ${AWS_SECRET_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - uploads:/app/uploads  # Si stockage local

  frontend:
    build: ./client
    environment:
      VITE_API_URL: http://192.168.x.x:3000  # IP serveur local
    ports:
      - "80:80"
    depends_on:
      - backend

  # OPTIONNEL : MinIO pour S3-compatible
  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"

volumes:
  postgres_data:
  uploads:
  minio_data:
```

---

#### [MODIFY] [client/Dockerfile](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/client/Dockerfile)

Ajouter build arg pour API URL :

```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
```

---

#### [NEW] [server/Dockerfile](file:///c:/Users/Vincent/Desktop/EduTrack%20V2/server/Dockerfile)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Verification Plan

### Automated Tests

#### Backend API Tests

Créer tests avec **Jest + Supertest** :

```bash
cd server
npm test
```

**Tests requis** :
- `auth.test.ts` : Register, Login, JWT validation
- `courses.test.ts` : CRUD courses + authorization
- `items.test.ts` : Upload fichier 10MB PDF
- `websocket.test.ts` : Émission sync events

**Commande** :
```bash
npm run test -- --coverage
```

---

#### Frontend Integration Tests

Tester appels API avec **Vitest** :

```bash
cd client
npm run test
```

**Tests** :
- `api/client.test.ts` : Interceptor JWT, gestion 401
- `stores/courseStore.test.ts` : CRUD via API mock

---

### Manual Verification

#### Test 1 : Multi-Device Sync

1. Ouvrir `http://192.168.x.x` sur PC1
2. Créer un cours "Test Sync"
3. Ouvrir `http://192.168.x.x` sur PC2 (même profil)
4. **Résultat attendu** : Cours apparaît en temps réel sans refresh

---

#### Test 2 : Upload PDF Lourd

1. Se connecter à l'application
2. Créer un cours
3. Ajouter ressource PDF de 100+ pages (>50MB)
4. Valider upload complet
5. Ouvrir PDF dans viewer intégré
6. **Résultat attendu** : Chargement fluide, pas d'erreur CORS

---

#### Test 3 : Concurrent Users

1. Créer 5 comptes utilisateurs
2. Se connecter simultanément depuis 5 navigateurs
3. Créer/modifier des cours en parallèle
4. **Résultat attendu** : Aucune collision, isolation des données par profil

---

#### Test 4 : Backup & Restore

1. Créer données de test (cours, items, flashcards)
2. Exécuter backup PostgreSQL :
   ```bash
   docker exec edutrack_postgres pg_dump -U edutrack edutrack_db > backup.sql
   ```
3. Supprimer BDD : `docker-compose down -v`
4. Restaurer :
   ```bash
   docker-compose up -d postgres
   docker exec -i edutrack_postgres psql -U edutrack edutrack_db < backup.sql
   ```
5. **Résultat attendu** : Toutes les données récupérées

---

## Deployment Checklist

- [ ] Variables d'environnement configurées dans Dokploy
- [ ] PostgreSQL persistant (volume monté)
- [ ] CORS configuré pour IP serveur
- [ ] JWT_SECRET généré (32+ caractères)
- [ ] Storage S3/local configuré
- [ ] Health checks backend (`/api/health`)
- [ ] Logs centralisés (Docker logs)
- [ ] Backup automatique BDD (cron)

---

*Plan prêt pour validation et implémentation*

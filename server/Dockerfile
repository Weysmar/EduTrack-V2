# Node 22 LTS (Node 20 reached end-of-life in April 2026)
FROM node:22-slim

# Install system dependencies for LibreOffice and Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libreoffice-writer \
    libreoffice-impress \
    libreoffice-calc \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for caching. npm ci installs exactly what package-lock.json pins
# (dev dependencies included: the prisma CLI and typescript are needed to build and start)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Tests unitaires avant le build : un test en échec arrête le déploiement
RUN npm run test:ci

# Build TypeScript
RUN npm run build

# Persist uploads directory across container recreations
VOLUME ["/app/uploads"]

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]

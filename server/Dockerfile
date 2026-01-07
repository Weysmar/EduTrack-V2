FROM node:20-slim

# Install system dependencies for LibreOffice and Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    libreoffice-writer \
    libreoffice-impress \
    libreoffice-calc \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["sh", "-c", "npx prisma db push && npm start"]

import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple PrismaClient instances
// Each instance creates its own connection pool, which can exhaust DB connections
const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log('[Prisma] Initializing client...');
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

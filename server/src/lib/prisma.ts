import { PrismaClient } from '@prisma/client';

// Singleton pattern: ensures only one PrismaClient instance exists
// Prevents connection pool exhaustion (was 21 separate instances before)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

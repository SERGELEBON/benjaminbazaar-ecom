import { PrismaClient } from '@prisma/client'

// Database: Supabase PostgreSQL (connected through the Vercel integration).
// Connection strings come from POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

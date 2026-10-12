import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// On Vercel the filesystem is read-only (except /tmp).
// Copy the bundled SQLite DB to /tmp so Prisma can read AND write.
function resolveDatabaseUrl(): string | undefined {
  if (process.env.VERCEL) {
    const src = path.join(process.cwd(), 'db', 'custom.db')
    const dst = '/tmp/custom.db'
    try {
      if (!fs.existsSync(dst) && fs.existsSync(src)) fs.copyFileSync(src, dst)
    } catch (e) {
      console.error('[db] copy to /tmp failed', e)
    }
    return `file:${dst}`
  }
  return process.env.DATABASE_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const url = resolveDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

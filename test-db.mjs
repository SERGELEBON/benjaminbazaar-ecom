import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

async function main() {
  console.log('Testing database connection...')
  const count = await prisma.category.count()
  console.log('✅ Categories count:', count)
  
  const cats = await prisma.category.findMany({ take: 3 })
  console.log('✅ Sample categories:', cats.map(c => c.name))
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    console.error('Full error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

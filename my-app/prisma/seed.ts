import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // Teams
  const teams = [
    { name: 'アルファ', color: '#ff0000' }, // Red
    { name: 'ベータ', color: '#0000ff' }, // Blue
    { name: 'ガンマ', color: '#00ff00' }, // Green
    { name: 'デルタ', color: '#ffff00' }, // Yellow
  ]

  for (const t of teams) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: {
        name: t.name,
        color: t.color,
        score: 0,
      },
    })
  }
  const allTeams = await prisma.team.findMany()
  console.log(`Teams created: ${allTeams.length}`)

  // Nodes (Random positions)
  // Clear existing nodes if needed? No, let's just create if not compatible or simple check
  // For simplicity, we delete all nodes in dev to re-seed clean
  await prisma.node.deleteMany()

  const initialNodes = [
    { name: 'センター', type: 'AMMO', x: 50, y: 50, captureRate: 50 },
    { name: '北哨所', type: 'MEAT', x: 50, y: 20, captureRate: 20 },
    { name: '南基地', type: 'VEGETABLE', x: 50, y: 80, captureRate: 20 },
    { name: '西塔', type: 'AMMO', x: 20, y: 50, captureRate: 30 },
    { name: '東堡', type: 'AMMO', x: 80, y: 50, captureRate: 30 },
  ]

  for (const n of initialNodes) {
    await prisma.node.create({
      data: {
        name: n.name,
        type: n.type,
        x: n.x,
        y: n.y,
        captureRate: n.captureRate,
        lastHarvestedAt: new Date(),
      },
    })
  }

  console.log('Nodes seeded')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

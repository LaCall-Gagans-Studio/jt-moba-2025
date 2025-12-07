import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // Teams
  const teams = [
    { name: 'アルファ', color: '#ef4444' }, // Red-500
    { name: 'ベータ', color: '#3b82f6' }, // Blue-500
    { name: 'ガンマ', color: '#22c55e' }, // Green-500
    { name: 'デルタ', color: '#eab308' }, // Yellow-500
  ]

  for (const t of teams) {
    await prisma.team.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: {
        name: t.name,
        color: t.color,
        score: 0,
      },
    })
  }

  // Nodes (IDs are fixed UUIDs for QR printing safety)
  await prisma.node.deleteMany()

  const initialNodes = [
    // SPICE
    { 
      id: '11111111-1111-1111-1111-111111111111', 
      name: 'セントラル・キッチン', type: 'SPICE', x: 50, y: 50, captureRate: 100,
      secretKey: 'secret-spice-1'
    },
    // MEAT
    { 
      id: '22222222-2222-2222-2222-222222222222',
      name: '第1精肉プラント', type: 'MEAT', x: 50, y: 15, captureRate: 50,
      secretKey: 'secret-meat-1'
    },
    { 
      id: '33333333-3333-3333-3333-333333333333',
      name: '第2精肉プラント', type: 'MEAT', x: 20, y: 80, captureRate: 50,
      secretKey: 'secret-meat-2'
    },
    // VEGETABLE
    { 
      id: '44444444-4444-4444-4444-444444444444',
      name: '水耕栽培ドームA', type: 'VEGETABLE', x: 80, y: 20, captureRate: 40,
      secretKey: 'secret-veg-1'
    },
    { 
      id: '55555555-5555-5555-5555-555555555555',
      name: '水耕栽培ドームB', type: 'VEGETABLE', x: 15, y: 50, captureRate: 40,
      secretKey: 'secret-veg-2'
    },
    // WATER
    { 
      id: '66666666-6666-6666-6666-666666666666',
      name: '浄水セクター', type: 'WATER', x: 85, y: 85, captureRate: 30,
      secretKey: 'secret-water-1'
    },
  ]

  for (const n of initialNodes) {
    await prisma.node.create({
      data: {
        id: n.id,
        name: n.name,
        type: n.type,
        x: n.x,
        y: n.y,
        captureRate: n.captureRate,
        secretKey: n.secretKey, // 追加したSecretKey
        lastHarvestedAt: new Date(),
      },
    })
  }

  console.log('Nodes seeded with FIXED IDs and Secrets')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
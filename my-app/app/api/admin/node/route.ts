import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const nodes = await prisma.node.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(nodes)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, type, x, y, captureRate } = body

    if (!name || x === undefined || y === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const newNode = await prisma.node.create({
      data: {
        name,
        type: type || 'AMMO',
        x,
        y,
        captureRate: Number(captureRate) || 10,
      },
    })

    return NextResponse.json({ success: true, node: newNode })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 })
  }
}

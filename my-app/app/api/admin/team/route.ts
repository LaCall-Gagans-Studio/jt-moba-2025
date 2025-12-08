import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        resources: true,
        _count: {
          select: { nodes: true }
        }
      },
      orderBy: {
        score: 'desc'
      }
    })
    return NextResponse.json(teams)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// dynamic
export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { name, type, captureRate, x, y } = body

    const updated = await prisma.node.update({
      where: { id },
      data: {
        name,
        type,
        captureRate: Number(captureRate),
        x: Number(x),
        y: Number(y),
      },
    })

    return NextResponse.json({ success: true, node: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await prisma.node.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

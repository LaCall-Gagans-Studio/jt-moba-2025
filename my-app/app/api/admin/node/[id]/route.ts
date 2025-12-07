import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT: ノード情報の更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 修正点1: Promise型にする
) {
  try {
    const { id } = await params // 修正点2: awaitする
    const body = await req.json()
    const { name, type, x, y, captureRate } = body

    const updatedNode = await prisma.node.update({
      where: { id },
      data: {
        name,
        type,
        x,
        y,
        captureRate: Number(captureRate),
      },
    })

    return NextResponse.json({ success: true, node: updatedNode })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 })
  }
}

// DELETE: ノードの削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 修正点1: Promise型にする
) {
  try {
    const { id } = await params // 修正点2: awaitする

    await prisma.node.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 })
  }
}
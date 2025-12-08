import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. 支配されている全ての拠点を取得
    const nodes = await prisma.node.findMany({
      where: {
        controlledById: { not: null }
      }
    })

    if (nodes.length === 0) {
      return NextResponse.json({ message: 'No controlled nodes' })
    }

    // 2. チームごとの加算スコアを計算 (Resource Breakdownあり)
    // 構造: { teamId: { total: number, resources: { [type]: number } } }
    const teamUpdates: Record<string, { total: number, resources: Record<string, number> }> = {}

    for (const node of nodes) {
      if (!node.controlledById) continue
      const teamId = node.controlledById
      
      if (!teamUpdates[teamId]) {
        teamUpdates[teamId] = { total: 0, resources: {} }
      }

      // 合計加算
      teamUpdates[teamId].total += node.captureRate

      // タイプ別加算
      if (!teamUpdates[teamId].resources[node.type]) {
          teamUpdates[teamId].resources[node.type] = 0
      }
      teamUpdates[teamId].resources[node.type] += node.captureRate
    }

    // 3. データベース更新 (トランザクション)
    const updates = []
    
    for (const [teamId, data] of Object.entries(teamUpdates)) {
        // 各Resourceタイプごとにupsert処理を作成
        const resourceUpserts = Object.entries(data.resources).map(([type, amount]) => {
            return prisma.teamResource.upsert({
                where: { teamId_type: { teamId, type } },
                update: { amount: { increment: amount } },
                create: { teamId, type, amount }
            })
        })

        // トランザクション実行 (Team更新 + Resource更新)
        updates.push(
            prisma.$transaction([
                prisma.team.update({
                    where: { id: teamId },
                    data: { score: { increment: data.total } }
                }),
                ...resourceUpserts
            ]).then(([updatedTeam]) => ({
                teamId,
                newScore: updatedTeam.score,
                added: data.total
            }))
        )
    }

    const results = await Promise.all(updates)

    // 4. クライアントへ一斉通知 (Pusher)
    for (const result of results) {
      await pusherServer.trigger('game-channel', 'score-update', {
        teamId: result.teamId,
        newScore: result.newScore
      })
    }

    return NextResponse.json({
      success: true,
      processedTeams: results.length,
      details: results
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // シングルトンの方をインポート
import { pusherServer } from '@/lib/pusher'

// レスポンスをキャッシュしない設定
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nodeId, teamName } = body

    // 1. 入力チェック
    if (!nodeId || !teamName) {
      return NextResponse.json({ error: 'Missing nodeId or teamName' }, { status: 400 })
    }

    // 2. データ取得
    const node = await prisma.node.findUnique({ 
      where: { id: nodeId }, 
      include: { controlledBy: true } 
    })
    
    const team = await prisma.team.findUnique({ 
      where: { name: teamName } 
    })

    // 3. 存在チェック
    if (!node || !team) {
      return NextResponse.json({ error: 'Node or Team not found' }, { status: 404 })
    }

    // 4. ロジック分岐 (敵拠点なら制圧、自軍拠点なら回収)
    const isEnemyOrNeutral = node.controlledById !== team.id

    if (isEnemyOrNeutral) {
      // --- CAPTURE (制圧) ---
      // 1. 拠点を自軍のものにする
      const updatedNode = await prisma.node.update({
        where: { id: nodeId },
        data: {
          controlledById: team.id,
          lastHarvestedAt: new Date(), // 制圧時はタイマーリセット
        },
      })

      // 2. 制圧ボーナス (即座にCaptureRate分のスコア加算)
      const captureBonus = node.captureRate
      
      // トランザクションで整合性担保
      const [updatedTeam, _] = await prisma.$transaction([
        prisma.team.update({
          where: { id: team.id },
          data: { score: { increment: captureBonus } }
        }),
        prisma.teamResource.upsert({
          where: {
            teamId_type: {
              teamId: team.id,
              type: node.type
            }
          },
          update: { amount: { increment: captureBonus } },
          create: {
            teamId: team.id,
            type: node.type,
            amount: captureBonus
          }
        })
      ])

      const logMessage = `【エリア制圧】${team.name}チームがエリア「${node.name}」を制圧！資源 ${captureBonus}kg (${node.type}) を確保！`
      const linkLog = await prisma.auditLog.create({
        data: {
          message: logMessage,
          teamId: team.id,
        },
      })

      // Pusher通知 (制圧 + スコア更新)
      await pusherServer.trigger('game-channel', 'map-update', {
        type: 'CAPTURE',
        nodeId: node.id,
        teamId: team.id,
        teamColor: team.color,
      })
      
      await pusherServer.trigger('game-channel', 'score-update', {
        teamId: team.id,
        newScore: updatedTeam.score,
      })

      await pusherServer.trigger('game-channel', 'log-new', {
        id: linkLog.id,
        message: logMessage,
        createdAt: linkLog.createdAt,
        teamColor: team.color,
      })

      return NextResponse.json({
        success: true,
        action: 'CAPTURE',
        message: `エリア「${node.name}」を制圧！(ボーナス +${captureBonus}kg)`,
        node: updatedNode,
      })

    } else {
      // --- PATROL (巡回) ---
      const now = new Date()
      const lastHarvest = new Date(node.lastHarvestedAt)
      const diffMs = now.getTime() - lastHarvest.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      // クールダウン (1分)
      if (diffMinutes < 1) {
        return NextResponse.json({
          success: false,
          action: 'PATROL',
          message: '巡回済みです。次の巡回まで待機してください。',
        })
      }

      // 巡回ボーナス (固定 5kg)
      const patrolBonus = 5

      // チームスコア更新 (トランザクション)
      const [updatedTeam, _] = await prisma.$transaction([
          prisma.team.update({
            where: { id: team.id },
            data: { score: { increment: patrolBonus } },
          }),
          prisma.teamResource.upsert({
            where: {
                teamId_type: {
                    teamId: team.id,
                    type: node.type
                }
            },
            update: { amount: { increment: patrolBonus } },
            create: {
                teamId: team.id,
                type: node.type,
                amount: patrolBonus
            }
          })
      ])

      // 最終アクション時刻更新
      await prisma.node.update({
        where: { id: nodeId },
        data: { lastHarvestedAt: now },
      })

      // ログ作成
      const logMessage = `【定期巡回】${team.name}チームが${node.name}の安全を確認。ボーナス ${patrolBonus}kg を受領。`
      const linkLog = await prisma.auditLog.create({
        data: {
          message: logMessage,
          teamId: team.id,
        },
      })

      // Pusher通知
      await pusherServer.trigger('game-channel', 'score-update', {
        teamId: team.id,
        newScore: updatedTeam.score,
      })

      await pusherServer.trigger('game-channel', 'log-new', {
        id: linkLog.id,
        message: logMessage,
        createdAt: linkLog.createdAt,
        teamColor: team.color,
      })

       return NextResponse.json({
        success: true,
        action: 'PATROL',
        message: `巡回完了: 物資 ${patrolBonus}kg を受領`,
        amount: patrolBonus,
      })
    }

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
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
      const updatedNode = await prisma.node.update({
        where: { id: nodeId },
        data: {
          controlledById: team.id,
          lastHarvestedAt: new Date(), // 制圧時はタイマーリセット
        },
      })

      const logMessage = `【作戦報告】${team.name}小隊がエリア「${node.name}」を制圧完了！`
      const linkLog = await prisma.auditLog.create({
        data: {
          message: logMessage,
          teamId: team.id,
        },
      })

      // Pusher通知
      await pusherServer.trigger('game-channel', 'map-update', {
        type: 'CAPTURE',
        nodeId: node.id,
        teamId: team.id,
        teamColor: team.color,
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
        message: `エリア「${node.name}」の制圧に成功。`,
        node: updatedNode,
      })

    } else {
      // --- HARVEST (回収) ---
      const now = new Date()
      const lastHarvest = new Date(node.lastHarvestedAt)
      const diffMs = now.getTime() - lastHarvest.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) {
        return NextResponse.json({
          success: false,
          action: 'HARVEST',
          message: '資源再生サイクル中。待機せよ。',
        })
      }

      const amount = Math.floor(diffMinutes * node.captureRate)
      if (amount <= 0) {
         return NextResponse.json({
          success: false,
          action: 'HARVEST',
          message: '回収可能な資源なし。',
        })
      }

      // チームスコア更新
      const updatedTeam = await prisma.team.update({
        where: { id: team.id },
        data: { score: { increment: amount } },
      })

      // 最終回収時刻更新
      await prisma.node.update({
        where: { id: nodeId },
        data: { lastHarvestedAt: now },
      })

      // ログ作成
      const unit = node.type === 'WATER' ? 'L' : 'kg'
      const logMessage = `【物資回収】${team.name}小隊が${node.name}にて${node.type}を${amount}${unit}確保。`
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
        action: 'HARVEST',
        message: `物資回収完了: ${amount}${unit} (${node.type})`,
        amount: amount,
      })
    }

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
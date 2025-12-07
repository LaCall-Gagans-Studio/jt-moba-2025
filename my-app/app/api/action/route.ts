import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { pusherServer } from '@/lib/pusher'

const prisma = new PrismaClient()

// Force dynamic to ensure we don't cache responses
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nodeId, teamName } = body

    if (!nodeId || !teamName) {
      return NextResponse.json({ error: 'Missing nodeId or teamName' }, { status: 400 })
    }

    // 1. Fetch Node and Team
    const node = await prisma.node.findUnique({ where: { id: nodeId }, include: { controlledBy: true } })
    const team = await prisma.team.findUnique({ where: { name: teamName } })

    if (!node || !team) {
      return NextResponse.json({ error: 'Node or Team not found' }, { status: 404 })
    }

    // Logic Branch
    const isEnemyOrNeutral = node.controlledById !== team.id

    if (isEnemyOrNeutral) {
      // -- CAPTURE LOGIC --
      // Capture the node
      const updatedNode = await prisma.node.update({
        where: { id: nodeId },
        data: {
          controlledById: team.id,
          lastHarvestedAt: new Date(), // Reset harvest timer on capture
        },
      })

      // Create Audit Log
      const logMessage = `Team ${team.name} captured ${node.name}!`
      const linkLog = await prisma.auditLog.create({
        data: {
          message: logMessage,
          teamId: team.id,
        },
      })

      // Trigger Pusher
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
        message: `You captured ${node.name}!`,
        node: updatedNode,
      })

    } else {
      // -- HARVEST LOGIC --
      const now = new Date()
      const lastHarvest = new Date(node.lastHarvestedAt)
      const diffMs = now.getTime() - lastHarvest.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) {
        return NextResponse.json({
          success: false,
          action: 'HARVEST',
          message: 'Resources regenerate every minute. Wait a bit!',
        })
      }

      // Calculate amount
      const amount = Math.floor(diffMinutes * node.captureRate)
      if (amount <= 0) {
        // Technically captured by diffMinutes check, but safe guard
         return NextResponse.json({
          success: false,
          action: 'HARVEST',
          message: 'No resources to harvest yet.',
        })
      }

      // Update Team Score & Node Timer
      const updatedTeam = await prisma.team.update({
        where: { id: team.id },
        data: { score: { increment: amount } },
      })

      await prisma.node.update({
        where: { id: nodeId },
        data: { lastHarvestedAt: now },
      })

       // Create Audit Log
      const logMessage = `Team ${team.name} collected ${amount} ${node.type} from ${node.name}.`
      const linkLog = await prisma.auditLog.create({
        data: {
          message: logMessage,
          teamId: team.id,
        },
      })

      // Trigger Pusher
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
        message: `Harvested ${amount} ${node.type}!`,
        amount: amount,
      })
    }

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

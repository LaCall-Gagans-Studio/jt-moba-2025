import { prisma } from '@/lib/prisma'
import ClientMap from '@/components/ClientMap'

// Force dynamic to fetch fresh data on load
export const dynamic = 'force-dynamic'

async function getInitialData() {
  try {
    const nodes = await prisma.node.findMany({ include: { controlledBy: true } })
    const teams = await prisma.team.findMany({ orderBy: { score: 'desc' } })
    const initialLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { team: true }
    })
    return { nodes, teams, initialLogs }
  } catch (e) {
    console.error("DB Fetch Error:", e)
    return { nodes: [], teams: [], initialLogs: [] }
  }
}

export default async function GamePage() {
  const { nodes, teams, initialLogs } = await getInitialData()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-black">
      <ClientMap initialNodes={nodes} initialTeams={teams} initialLogs={initialLogs} />
    </main>
  )
}

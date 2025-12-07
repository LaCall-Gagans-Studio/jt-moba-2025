import { prisma } from '@/lib/prisma'
import NodeActionClient from '@/components/NodeActionClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NodePage({ params }: { params: { id: string } }) {
  const { id } = await params
  if (!id) return notFound()

  const node = await prisma.node.findUnique({
    where: { id },
    include: { controlledBy: true }
  })

  // Also fetch all teams to allow selection
  const teams = await prisma.team.findMany()

  if (!node) return notFound()

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <NodeActionClient node={node} teams={teams} />
    </main>
  )
}

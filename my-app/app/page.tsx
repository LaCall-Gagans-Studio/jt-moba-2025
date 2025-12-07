import { prisma } from '@/lib/prisma'
import LandingClient from '@/components/LandingClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  return (
    <main className="min-h-screen bg-black text-white">
      <LandingClient teams={teams} />
    </main>
  )
}

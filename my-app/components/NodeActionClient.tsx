'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function NodeActionClient({ node, teams }: { node: any, teams: any[] }) {
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Restore team from local storage
    const stored = localStorage.getItem('my-team')
    if (stored) setSelectedTeam(stored)
  }, [])

  const handleSetTeam = (teamName: string) => {
    setSelectedTeam(teamName)
    localStorage.setItem('my-team', teamName)
  }

  const handleAction = async () => {
    if (!selectedTeam) {
      toast.error('Please select a team first!')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: node.id, teamName: selectedTeam })
      })
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || 'Action failed')
      } else {
        if (data.success) {
          toast.success(data.message)
          setResult(data)
          // Refresh page data? Or just rely on local state?
          // For now, let's just show the result.
           router.refresh()
        } else {
           toast.info(data.message)
        }
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const currentTeam = teams.find(t => t.name === selectedTeam)

  if (!selectedTeam) {
    return (
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-white">
        <CardHeader>
          <CardTitle className="text-center text-neon-blue">IDENTITY IDENTIFICATION</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-zinc-400">Select your faction.</p>
          <div className="grid grid-cols-2 gap-4">
            {teams.map(team => (
              <Button 
                key={team.id}
                onClick={() => handleSetTeam(team.name)}
                className="w-full h-16 text-lg font-bold border-2"
                style={{ borderColor: team.color, color: team.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                {team.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isEnemy = node.controlledBy?.id && node.controlledBy?.name !== selectedTeam
  const isNeutral = !node.controlledBy
  const isFriendly = node.controlledBy?.name === selectedTeam

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      {/* Header */}
      <div className="text-center">
        <div className="text-sm text-zinc-500 mb-1">CURRENT LOCATION</div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{node.name}</h1>
        <div className="mt-2 inline-block px-3 py-1 rounded border border-zinc-700 bg-zinc-800 text-xs text-zinc-300">
           TYPE: <span className="text-neon-green">{node.type}</span>
        </div>
      </div>

      {/* Controller Status */}
      <Card className="w-full bg-zinc-900 border-zinc-800 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: node.controlledBy?.color || '#555' }}></div>
        <CardContent className="pt-6">
           <div className="flex flex-col items-center">
             <span className="text-xs uppercase tracking-widest text-zinc-500 mb-2">CONTROLLED BY</span>
             {node.controlledBy ? (
               <span className="text-3xl font-bold" style={{ color: node.controlledBy.color }}>
                 {node.controlledBy.name}
               </span>
             ) : (
               <span className="text-3xl font-bold text-zinc-500">NEUTRAL</span>
             )}
           </div>
        </CardContent>
      </Card>

      {/* Action Area */}
      <div className="w-full">
         <Button 
           disabled={loading}
           onClick={handleAction}
           className="w-full h-24 text-2xl font-black tracking-widest cyber-glitch relative overflow-hidden group"
           style={{
             borderColor: isFriendly ? '#00ff00' : '#ff0000',
             color: isFriendly ? '#00ff00' : '#ff0000',
             background: 'transparent'
           }}
         >
           <span className="absolute inset-0 bg-current opacity-10 group-hover:opacity-20 transition-opacity"></span>
           <span className="relative z-10 flex flex-col items-center">
             {loading ? 'PROCESSING...' : (
               <>
                 {isFriendly && 'HARVEST RESOURCES'}
                 {(isEnemy || isNeutral) && 'CAPTURE NODE'}
               </>
             )}
             <span className="text-xs font-normal mt-1 opacity-70">
                {isFriendly && `Rate: ${node.captureRate}/min`}
                {(isEnemy || isNeutral) && 'Taking control...'}
             </span>
           </span>
         </Button>
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-4 p-4 w-full bg-zinc-800 border-l-4 border-white text-sm">
          {result.message}
        </div>
      )}

      {/* Team Info / Switch */}
      <div className="mt-8 flex flex-col items-center gap-2">
         <span className="text-xs text-zinc-600">OPERATING AS</span>
         <span className="font-bold" style={{ color: currentTeam?.color }}>{selectedTeam}</span>
         <button onClick={() => setSelectedTeam('')} className="text-xs text-zinc-500 underline hover:text-white">
           Change Faction
         </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { pusherClient } from '@/lib/pusher'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge' // Will create next
import { ScrollArea } from '@/components/ui/scroll-area' // Optional, using simple div/overflow for now
import { format } from 'date-fns'
import Link from 'next/link'
import { MapPin, Zap, RefreshCw } from 'lucide-react'

// Define types locally since Prisma client might not be generated yet in dev environment
type Team = {
  id: string
  name: string
  color: string
  score: number
}

type Node = {
  id: string
  name: string
  x: number
  y: number
  type: string
  controlledById: string | null
  controlledBy?: Team | null
  captureRate: number
}

type AuditLog = {
  id: string
  message: string
  createdAt: Date
  teamId: string | null
  team?: Team | null
  // Extra for realtime
  teamColor?: string
}

interface ClientMapProps {
  initialNodes: any[] // relaxed type
  initialTeams: any[]
  initialLogs: any[]
}

export default function ClientMap({ initialNodes, initialTeams, initialLogs }: ClientMapProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs)

  // Map Image Ref
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Subscribe to Pusher
    const channel = pusherClient.subscribe('game-channel')

    channel.bind('map-update', (data: any) => {
      // data: { type: 'CAPTURE', nodeId, teamId, teamColor }
      setNodes((prev) => prev.map(n => 
        n.id === data.nodeId 
          ? { ...n, controlledById: data.teamId, controlledBy: teams.find(t => t.id === data.teamId) || n.controlledBy }
          : n
      ))
    })

    channel.bind('score-update', (data: any) => {
      // data: { teamId, newScore }
      setTeams((prev) => prev.map(t => 
        t.id === data.teamId ? { ...t, score: data.newScore } : t
      ))
    })

    channel.bind('log-new', (data: any) => {
      // data: { id, message, createdAt, teamColor }
      setLogs((prev) => [{
        id: data.id,
        message: data.message,
        createdAt: new Date(data.createdAt),
        teamId: null, // simplified
        teamColor: data.teamColor
      }, ...prev].slice(0, 50)) // Keep last 50
    })

    return () => {
      pusherClient.unsubscribe('game-channel')
    }
  }, [teams])

  // Helper to get team color
  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return '#888888' // Neutral gray
    const team = teams.find(t => t.id === teamId)
    return team ? team.color : '#888888'
  }

  return (
    <div className="relative w-full h-screen text-white bg-zinc-950 overflow-hidden">
      
      {/* HUD: Top Bar (Scores) */}
      <div className="absolute top-0 left-0 w-full z-20 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
        <div className="flex gap-4">
          {teams.map(team => (
            <div key={team.id} className="cyber-panel px-4 py-2 flex flex-col items-center min-w-[100px]" style={{ borderColor: team.color }}>
              <span className="text-xs uppercase tracking-widest text-zinc-400">{team.name}</span>
              <span className="text-2xl font-bold font-mono" style={{ color: team.color }}>${team.score}</span>
            </div>
          ))}
        </div>
        <div className="cyber-panel px-4 py-1">
          <span className="text-xs text-zinc-500">LIVE FEED</span>
        </div>
      </div>

      {/* Map Area */}
      <div ref={mapRef} className="absolute inset-0 z-0 bg-neutral-900">
        {/* Placeholder Map Pattern */}
        <div className="w-full h-full opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '50px 50px' 
             }}>
        </div>
        
        {/* Nodes */}
        {nodes.map(node => (
          <Link href={`/node/${node.id}`} key={node.id}>
             <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                 {/* Pin Icon */}
                 <div 
                   className="w-12 h-12 rounded-full border-4 flex items-center justify-center bg-black/80 shadow-[0_0_15px_currentColor] transition-all duration-300 group-hover:scale-110"
                   style={{ borderColor: getTeamColor(node.controlledById), color: getTeamColor(node.controlledById) }}
                 >
                    {node.type === 'MEAT' && <span className="text-xl">🍖</span>}
                    {node.type === 'VEGETABLE' && <span className="text-xl">🥬</span>}
                    {node.type === 'AMMO' && <span className="text-xl">🔫</span>}
                 </div>
                 {/* Label */}
                 <div className="mt-2 text-xs font-bold uppercase tracking-wider bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-zinc-700">
                   {node.name}
                 </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* HUD: Bottom Log */}
      <div className="absolute bottom-0 left-0 w-full md:w-1/3 h-1/3 bg-gradient-to-t from-black via-black/90 to-transparent p-4 flex flex-col justify-end pointer-events-none">
        <div className="flex flex-col-reverse h-full overflow-hidden mask-image-gradient">
           {logs.map((log) => (
             <div key={log.id} className="mb-2 text-sm font-mono flex items-start animate-in slide-in-from-left-5">
               <span className="text-zinc-500 mr-2 text-xs">
                 {format(new Date(log.createdAt), 'HH:mm:ss')}
               </span>
               <span style={{ color: log.teamColor || '#fff' }}>
                 {log.message}
               </span>
             </div>
           ))}
        </div>
      </div>

    </div>
  )
}

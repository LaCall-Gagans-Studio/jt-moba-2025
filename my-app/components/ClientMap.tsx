'use client'

import { useEffect, useState, useRef } from 'react'
import { pusherClient } from '@/lib/pusher'
import { format } from 'date-fns'
import Link from 'next/link'
import { Radio, Target } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import QRScanner from './QRScanner'
import { motion } from 'framer-motion'

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
  x: number // 0-100%
  y: number // 0-100%
  type: string
  controlledById: string | null
  controlledBy?: Team | null
  captureRate: number // per min
}

type AuditLog = {
  id: string
  message: string
  createdAt: Date
  teamId: string | null
  team?: Team | null
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
  const [isScanning, setIsScanning] = useState(false)
  const [myTeam, setMyTeam] = useState<string>('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Map Constraint Ref
  const constraintsRef = useRef(null)

  // Auto-Login via URL
  useEffect(() => {
    const teamParam = searchParams.get('team')
    if (teamParam) {
      // Validate if team exists
      const targetTeam = initialTeams.find(t => t.name === teamParam)
      if (targetTeam) {
        localStorage.setItem('my-team', teamParam)
        if (myTeam !== teamParam) setMyTeam(teamParam)
        toast.success(`所属確認: ${teamParam}小隊`, { position: 'top-center' })
      } else {
        toast.error('無効なチーム指定です')
      }
    } else {
      const stored = localStorage.getItem('my-team')
      if (stored && myTeam !== stored) setMyTeam(stored)
    }
  }, [searchParams, initialTeams, myTeam])

  const onGlobalScan = (data: string) => {
    if (data) {
        setIsScanning(false)
        router.push(`/node/${data}?verified=true`)
        toast.success("ターゲット捕捉・アクセス開始")
    }
  }

  useEffect(() => {
    // Subscribe to Pusher
    const channel = pusherClient.subscribe('game-channel')

    channel.bind('map-update', (data: any) => {
      setNodes((prev) => prev.map(n => 
        n.id === data.nodeId 
          ? { ...n, controlledById: data.teamId, controlledBy: teams.find(t => t.id === data.teamId) || n.controlledBy }
          : n
      ))
    })

    channel.bind('score-update', (data: any) => {
      setTeams((prev) => prev.map(t => 
        t.id === data.teamId ? { ...t, score: data.newScore } : t
      ))
    })

    channel.bind('log-new', (data: any) => {
      setLogs((prev) => [{
        id: data.id,
        message: data.message,
        createdAt: new Date(data.createdAt),
        teamId: null, // simplified
        teamColor: data.teamColor
      }, ...prev].slice(0, 50)) 
    })

    return () => {
      pusherClient.unsubscribe('game-channel')
    }
  }, [teams])

  // Helper to get team color
  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return '#333333' // Darker neutral
    const team = teams.find(t => t.id === teamId)
    return team ? team.color : '#333333'
  }

  // Define icon based on type
  const getTypeIcon = (type: string) => {
     switch(type) {
       case 'MEAT': return '🥩'
       case 'VEGETABLE': return '🥬'
       case 'SPICE': return '🌶️'
       case 'WATER': return '💧'
       default: return '📦'
     }
  }

  return (
    <div className="relative w-full h-screen text-white bg-zinc-950 overflow-hidden font-mono tracking-tight selection:bg-cyan-500/30">
      
      {/* Screen Overlays (Fixed) */}
      <div className="absolute inset-0 pointer-events-none z-20">
         {/* Vignette */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
         {/* Scanlines */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-1 bg-size-[100%_2px,3px_100%] pointer-events-none"></div>
      </div>
      
      {/* HUD Elements (Fixed z-30) */}
      <div className="absolute top-0 left-0 w-full z-30 pt-4 px-4 pb-12 bg-linear-to-b from-black via-black/80 to-transparent flex flex-wrap gap-2 justify-between items-start pointer-events-none">
        {/* Team Status Card (Top Left) */}
        {myTeam ? (
           <div className="flex items-center gap-3 backdrop-blur-sm bg-black/40 border-l-4 border-cyan-500 pl-3 pr-4 py-2 clip-path-polygon">
              <Radio className="w-4 h-4 text-cyan-500 animate-pulse" />
              <div>
                 <div className="text-[10px] text-cyan-500 leading-none mb-1">CURRENT UNIT</div>
                 <div className="text-lg font-bold leading-none">{myTeam}</div>
              </div>
           </div>
        ) : (
           <div className="flex items-center gap-3 backdrop-blur-sm bg-black/40 border-l-4 border-red-500 pl-3 pr-4 py-2">
              <div className="text-red-500 font-bold animate-pulse">UNIT UNIDENTIFIED</div>
           </div>
        )}

        {/* Global Resource Ticker (Top Right) */}
        <div className="flex gap-2">
          {teams.map(team => (
            <div key={team.id} className="relative group">
               <div 
                 className="px-3 py-1 min-w-[80px] text-right border-b-2 bg-black/50 backdrop-blur-md transition-all"
                 style={{ borderColor: team.color }}
               >
                 <span className="block text-[10px] opacity-70 mb-0.5" style={{ color: team.color }}>{team.name}</span>
                 <span className="block text-xl font-bold font-mono tracking-tighter" style={{ textShadow: `0 0 10px ${team.color}` }}>
                   {team.score.toLocaleString()}<span className="text-[10px] ml-1 opacity-50">kcal</span>
                 </span>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraints Container for Dragging - effectively the 'edges' of where we can drag */}
      {/* Actually, if we want infinite-like scroll we don't need constraints, but let's try to center start */}
      
      {/* Draggable Map Area */}
      <motion.div 
        className="absolute top-0 left-0 z-10 bg-zinc-900 cursor-move"
        // 300% size, centered initially (-100%, -100%)
        initial={{ x: '-100vw', y: '-100vh' }}
        style={{ width: '300vw', height: '300vh' }}
        drag
        dragElastic={0.2} 
        dragMomentum={true}
      >
        {/* Map Grid Pattern (Moves with map) */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', 
               backgroundSize: '100px 100px' 
             }}>
        </div>
        
        {/* Nodes */}
        {nodes.map(node => (
          <Link href={`/node/${node.id}`} key={node.id}>
             {/* 
                We place nodes on the 300% map.
                If coordinates are 0-100%, they will span the whole 300% area.
                Wait, if node.x is 50, it means 50% of 300vw, which is 150vw. perfect center.
             */}
             <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                 {/* Pin Icon */}
                 <div 
                   className="w-16 h-16 clip-path-hexagon flex items-center justify-center bg-black/90 shadow-[0_0_15px_currentColor] transition-all duration-300 group-hover:scale-110 group-hover:bg-zinc-800 border-2"
                   style={{ borderColor: getTeamColor(node.controlledById), color: getTeamColor(node.controlledById), boxShadow: `0 0 30px ${getTeamColor(node.controlledById)}66` }}
                 >
                    <span className="text-3xl filter drop-shadow-md">{getTypeIcon(node.type)}</span>
                 </div>
                 
                 {/* Connection Line */}
                 <div className={`h-12 w-1 bg-current opacity-50 absolute top-full left-1/2 -translate-x-1/2 -z-10`} style={{ color: getTeamColor(node.controlledById) }}></div>
                 
                 {/* Label */}
                 <div className="mt-4" style={{ color: getTeamColor(node.controlledById) }}>
                   <div className="text-xs font-bold uppercase tracking-widest bg-black/80 px-3 py-1 border border-current shadow-lg backdrop-blur-md">
                     {node.name}
                   </div>
                   <div className="text-[10px] text-center bg-black/90 text-white px-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Rate: {node.captureRate}kg/min
                   </div>
                 </div>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>

      {/* FAB (Fixed z-30) */}
      <div className="absolute bottom-8 right-8 z-30">
        <button
          onClick={() => setIsScanning(true)}
          className="group relative w-20 h-20 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 flex items-center justify-center overflow-hidden transition-all hover:scale-105 active:scale-95 hover:bg-cyan-500 hover:text-black backdrop-blur-md"
        >
          {/* Radar Sweep Effect */}
          <div className="absolute inset-0 bg-linear-to-tr from-transparent via-cyan-500/20 to-transparent animate-spin-slow opacity-0 group-hover:opacity-100" />
          <Target className="w-10 h-10 relative z-10" />
          <div className="absolute -bottom-8 right-full w-40 text-right mr-6 text-sm text-cyan-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
             広域スキャン開始 &gt;&gt;
          </div>
        </button>
      </div>

      {/* Global Scanner Overlay */}
      {isScanning && (
        <QRScanner 
          onScan={onGlobalScan}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* HUD: Bottom Log (Fixed z-30) */}
      <div className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/3 bg-linear-to-t from-black via-black/80 to-transparent p-4 flex flex-col justify-end pointer-events-none z-30">
        <div className="flex items-center gap-2 mb-2 opacity-50">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] text-green-500 tracking-widest">SYSTEM LOG // ENCRYPTED</span>
        </div>
        <div className="flex flex-col-reverse h-full overflow-hidden mask-image-gradient border-l border-zinc-800 pl-4">
           {logs.map((log) => (
             <div key={log.id} className="mb-1.5 text-xs font-mono flex items-start animate-in slide-in-from-left-5">
               <span className="text-zinc-600 mr-3 shrink-0">
                 [{format(new Date(log.createdAt), 'HH:mm:ss')}]
               </span>
               <span style={{ color: log.teamColor || '#aaa', textShadow: log.teamColor ? `0 0 5px ${log.teamColor}66` : 'none' }}>
                 {log.message}
               </span>
             </div>
           ))}
        </div>
      </div>

    </div>
  )
}

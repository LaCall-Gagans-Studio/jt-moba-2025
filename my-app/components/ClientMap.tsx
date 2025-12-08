'use client'

import { useEffect, useState, useRef } from 'react'
import { pusherClient } from '@/lib/pusher'
import { format } from 'date-fns'
import { Radio, Target, Eye } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import QRScanner from './QRScanner'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import LoadingOverlay from './ui/LoadingOverlay'

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
  const [isLoading, setIsLoading] = useState(false)
  const [myTeam, setMyTeam] = useState<string>('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const isSpectator = searchParams.get('mode') === 'spectator'

  // Auto-Login via URL
  useEffect(() => {
    if (isSpectator) return

    const teamParam = searchParams.get('team')
    if (teamParam) {
      // Validate if team exists
      const targetTeam = initialTeams.find(t => t.name === teamParam)
      if (targetTeam) {
        localStorage.setItem('my-team', teamParam)
        
        // State更新のループを防ぐため、現在の値と比較してから更新
        setMyTeam(prev => {
            if (prev !== teamParam) {
                toast.success(`所属確認: ${teamParam}チーム`, { position: 'top-center' })
                return teamParam
            }
            return prev
        })
      } else {
        // ここでのエラー表示は初回レンダリングで重複する可能性があるため控えめにするか、
        // 必要ならフラグ管理を行いますが、一旦コメントアウトまたは単純化します
        // toast.error('無効なチーム指定です')
      }
    } else {
      const stored = localStorage.getItem('my-team')
      if (stored) {
        setMyTeam(prev => prev !== stored ? stored : prev)
      }
    }
    // myTeam を依存配列から除外します（これがエラーの原因です）
    // 私たちは「URLが変わった時」に反応したいのであって、「myTeamが変わった時」に反応したいわけではありません
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialTeams, isSpectator]) // optimized deps // optimized deps

  const onGlobalScan = (data: string) => {
    if (data) {
        try {
            // New JSON format { id, secret }
            const parsed = JSON.parse(data)
            if (parsed.id && parsed.secret) {
                // Store secret credential
                sessionStorage.setItem(`node-secret-${parsed.id}`, parsed.secret)
                
                setIsScanning(false)
                router.push(`/node/${parsed.id}`) // No verified param needed
                toast.success("セキュリティ認証成功: アクセス権限取得")
                return
            }
        } catch {
            // Fallback for old format or invalid data
            console.log("Legacy format or invalid JSON")
        }

        // Old logic (should we keep it? User said "abolish URL param". But maybe good for fallback if needed. User was strict "completely prevent". So let's strict fail if not valid.)
        toast.error("無効なQRコードです")
    }
  }

  // Keep teams in ref to access inside Pusher callbacks without re-subscribing
  const teamsRef = useRef(teams)
  useEffect(() => {
    teamsRef.current = teams
  }, [teams])

  useEffect(() => {
    // Subscribe to Pusher
    const channel = pusherClient.subscribe('game-channel')

    channel.bind('map-update', (data: any) => {
      setNodes((prev) => prev.map(n => 
        n.id === data.nodeId 
          ? { ...n, controlledById: data.teamId, controlledBy: teamsRef.current.find(t => t.id === data.teamId) || n.controlledBy }
          : n
      ))
    })

    channel.bind('score-update', (data: any) => {
      setTeams((prev) => prev.map(t => 
        t.id === data.teamId ? { ...t, score: data.newScore } : t
      ))
    })

    channel.bind('log-new', (data: any) => {
      setLogs((prev) => {
        if (prev.some(log => log.id === data.id)) return prev
        return [{
          id: data.id,
          message: data.message,
          createdAt: new Date(data.createdAt),
          teamId: null, // simplified
          teamColor: data.teamColor
        }, ...prev].slice(0, 50)
      }) 
    })

    return () => {
      pusherClient.unsubscribe('game-channel')
    }
  }, [])

  // Helper to get team color
  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return '#aaaaaa' // Lighter neutral for visibility
    const team = teams.find(t => t.id === teamId)
    return team ? team.color : '#aaaaaa'
  }

  // Define icon based on type
  const getTypeIcon = (type: string) => {
      switch(type) {
        case 'MEAT': return '🍖'
        case 'VEGETABLE': return '🥬'
        case 'RICE': return '🍚'
        case 'NOODLE': return '🍜'
        case 'BREAD': return '🥖'
        case 'SEAFOOD': return '🦐'
        case 'SPICE': return '🌶️'
        case 'DAIRY': return '🧀'
        default: return '📦'
      }
  }

  return (
    <div className="relative w-full h-screen text-white bg-zinc-950 overflow-hidden font-mono tracking-tight selection:bg-cyan-500/30">
      {isLoading && <LoadingOverlay />}
      
      {/* Screen Overlays (Fixed) */}
      <div className="absolute inset-0 pointer-events-none z-20">
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
          {/* Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-1 bg-size-[100%_2px,3px_100%] pointer-events-none opacity-50"></div>
      </div>
      
      {/* HUD Elements (Fixed z-30) */}
      <div className="absolute top-0 left-0 w-full z-30 pt-safe-top px-4 pb-4 bg-linear-to-b from-black/90 via-black/80 to-transparent flex flex-wrap gap-2 justify-between items-start pointer-events-none backdrop-blur-sm">
        
        {/* Team Status Card (Top Left) */}
        {isSpectator ? (
           <div className="flex items-center gap-3 bg-zinc-900/80 border-l-4 border-zinc-500 pl-3 pr-4 py-2 clip-path-polygon shadow-lg">
              <Eye className="w-5 h-5 text-zinc-400" />
              <div>
                 <div className="text-[10px] text-zinc-400 leading-none mb-1 tracking-widest">MODE</div>
                 <div className="text-lg font-bold leading-none text-zinc-200">SPECTATOR</div>
              </div>
           </div>
        ) : myTeam ? (
           <div className="flex items-center gap-3 bg-zinc-900/80 border-l-4 border-cyan-500 pl-3 pr-4 py-2 clip-path-polygon shadow-lg">
              <Radio className="w-4 h-4 text-cyan-500 animate-pulse" />
              <div>
                 <div className="text-[10px] text-cyan-400 leading-none mb-1 tracking-widest">CURRENT UNIT</div>
                 <div className="text-lg font-bold leading-none text-white">{myTeam}</div>
              </div>
           </div>
        ) : (
           <div className="flex items-center gap-3 bg-zinc-900/80 border-l-4 border-red-500 pl-3 pr-4 py-2 shadow-lg">
              <div className="text-red-500 font-bold animate-pulse tracking-widest">UNIT UNIDENTIFIED</div>
           </div>
        )}

        {/* Global Resource Ticker (Top Right) */}
        <div className="flex gap-2">
          {teams.map(team => (
            <div key={team.id} className="relative group">
               <div 
                 className="px-2 py-1 min-w-[60px] md:min-w-[80px] text-right border-b-2 bg-black/70 backdrop-blur-md transition-all rounded-t-sm"
                 style={{ borderColor: team.color }}
               >
                 <span className="block text-[8px] md:text-[10px] opacity-80 mb-0.5 font-bold" style={{ color: team.color }}>{team.name}</span>
                 <span className="block text-sm md:text-xl font-bold font-mono tracking-tighter text-white" style={{ textShadow: `0 0 10px ${team.color}99` }}>
                   {team.score.toLocaleString()}
                 </span>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Territory Control Bar (New) */}
      <div className="absolute top-[80px] left-0 w-full z-20 flex h-2 bg-zinc-900/50 backdrop-blur-sm shadow-lg overflow-hidden border-y border-white/5">
        {(() => {
            const totalNodes = nodes.length
            if (totalNodes === 0) return null
            return teams.map(team => {
                const count = nodes.filter(n => n.controlledById === team.id).length
                if (count === 0) return null
                const width = (count / totalNodes) * 100
                return (
                    <div 
                        key={team.id}
                        className="h-full transition-all duration-500 ease-in-out relative group"
                        style={{ width: `${width}%`, backgroundColor: team.color }}
                    >
                         {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-shimmer" />
                    </div>
                )
            })
        })()}
        {/* Neutral Space */}
        <div className="flex-1 bg-zinc-800/30 h-full" />
      </div>

      {/* Main Map Area with Zoom/Pan */}
      <div className="absolute inset-0 z-10 w-full h-full bg-zinc-900">
        <TransformWrapper
          initialScale={0.5}
          minScale={0.2}
          maxScale={3}
          centerOnInit={true}
          limitToBounds={false}
          smooth={true}
          wheel={{ step: 0.1 }}
        >
          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-[2000px] !h-[2000px] relative" // Large fixed size map
          >
            {/* Map Image Background */}
            <div className="absolute inset-0 bg-zinc-900" 
                style={{ 
                  width: '2000px',
                  height: '2000px',
                }}>
                  <img 
                    src="/map.jpg" 
                    alt="Tactical Map" 
                    className="w-full h-full object-cover opacity-80"
                    draggable={false}
                  />
              {/* Optional Grid Overlay on top of image for effect - LESS INTENSE */}
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)',
                  backgroundSize: '100px 100px'
                }}
              />
            </div>

            {/* Territory Glow Layer (New) - Rendered underneath nodes */}
            {nodes.map(node => {
                if (!node.controlledById) return null
                const color = getTeamColor(node.controlledById)
                return (
                    <div
                        key={`glow-${node.id}`}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-1000"
                        style={{ 
                            left: `${node.x}%`, 
                            top: `${node.y}%`,
                            width: '2000px', // Large radius
                            height: '2000px',
                            background: `radial-gradient(circle closest-side, ${color}40 0%, ${color}10 40%, transparent 5%)`,
                            mixBlendMode: 'screen', // Additive blending for glow
                            zIndex: 15
                        }}
                    >
                        {/* Core intensifier */}
                        <div className="absolute inset-0 opacity-50" 
                             style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 30%)` }} 
                        />
                    </div>
                )
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                onClick={(e) => {
                    if (isSpectator) return
                    e.preventDefault()
                    e.stopPropagation()
                    setIsLoading(true)
                    // Small timeout to let state update and overlay render
                    setTimeout(() => {
                        router.push(`/node/${node.id}`)
                    }, 0)
                }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 group z-20 ${isSpectator ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                  <div className="relative flex flex-col items-center">
                    {/* Pin Icon - OPTIMIZED: No blur, no heavy shadow */}
                    <div 
                      className="w-24 h-24 clip-path-hexagon flex items-center justify-center bg-black/90 transition-transform duration-150 group-hover:scale-105 border-4"
                      style={{ 
                        borderColor: getTeamColor(node.controlledById), 
                        color: getTeamColor(node.controlledById),
                        // Removed heavy box-shadow
                      }}
                    >
                        <span className="text-5xl filter drop-shadow-sm">{getTypeIcon(node.type)}</span>
                    </div>
                    
                    {/* Connection Line & Base - Reduced opacity/animation impact */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-current rounded-full opacity-10 pointer-events-none" style={{ color: getTeamColor(node.controlledById) }}></div>

                    {/* Label - Reduced blur */}
                    <div className="mt-4" style={{ color: getTeamColor(node.controlledById) }}>
                      <div className="text-base font-black uppercase tracking-widest bg-black/90 px-4 py-1 border border-current shadow-sm text-center whitespace-nowrap">
                        {node.name}
                      </div>
                      <div className="text-xs text-center bg-black/90 text-white px-2 mt-1 rounded-full inline-block font-bold border border-zinc-800">
                          {node.captureRate} kg/min
                      </div>
                    </div>
                  </div>
              </div>
            ))}
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* FAB (Hidden for Spectator) - REPOSITIONED TO BOTTOM CENTER */}
      {!isSpectator && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setIsScanning(true)}
            className="group relative w-20 h-20 rounded-full bg-cyan-600/30 text-cyan-300 border-2 border-cyan-400 flex items-center justify-center overflow-hidden transition-all hover:scale-105 active:scale-95 hover:bg-cyan-500 hover:text-black backdrop-blur-xl shadow-lg shadow-cyan-900/50"
          >
            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-cyan-400/30 to-transparent animate-spin-slow opacity-0 group-hover:opacity-100" />
            <Target className="w-10 h-10 relative z-10" />
            <div className="absolute -bottom-8 right-full w-40 text-right mr-6 text-sm text-cyan-300 font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none bg-black/80 px-2 rounded">
               広域スキャン開始 &gt;&gt;
            </div>
          </button>
        </div>
      )}

      {/* Global Scanner Overlay */}
      {isScanning && !isSpectator && (
        <QRScanner 
          onScan={onGlobalScan}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* HUD: Bottom Log (Fixed z-30) */}
      <div className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/3 bg-linear-to-t from-black via-black/80 to-transparent p-4 pb-8 flex flex-col justify-end pointer-events-none z-20">
        <div className="flex items-center gap-2 mb-2 opacity-80 pl-4 border-l-2 border-green-500">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] text-green-400 tracking-widest font-bold">SYSTEM LOG // ENCRYPTED</span>
        </div>
        <div className="flex flex-col-reverse h-full overflow-hidden mask-image-gradient border-l border-zinc-700/50 pl-4 bg-black/20 backdrop-blur-sm rounded-r-lg">
           {logs.map((log) => (
             <div key={log.id} className="mb-2 text-xs font-mono flex items-start animate-in slide-in-from-left-5">
               <span className="text-zinc-400 mr-3 shrink-0 font-bold">
                 [{format(new Date(log.createdAt), 'HH:mm:ss')}]
               </span>
               <span style={{ 
                 color: log.teamColor || '#ddd', 
                 textShadow: log.teamColor ? `0 0 10px ${log.teamColor}aa` : 'none',
                 fontWeight: 'bold' 
               }}>
                 {log.message}
               </span>
             </div>
           ))}
        </div>
      </div>

    </div>
  )
}
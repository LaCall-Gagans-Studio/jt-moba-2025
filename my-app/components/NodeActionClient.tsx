'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Shield, Zap, Lock, Crosshair, X } from 'lucide-react'
import QRScanner from './QRScanner'
import { motion } from 'framer-motion'

export default function NodeActionClient({ node, teams }: { node: any, teams: any[] }) {
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  
  // Hold-to-Capture State
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const holdInterval = useRef<NodeJS.Timeout | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check verification status
  const isVerified = searchParams.get('verified') === 'true'

  useEffect(() => {
    // Restore team from local storage
    const stored = localStorage.getItem('my-team')
    if (stored) setSelectedTeam(stored)
  }, [])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (holdInterval.current) clearInterval(holdInterval.current)
    }
  }, [])
  const handleSetTeam = (team: string) => {
    setSelectedTeam(team)
    localStorage.setItem('my-team', team)
  }

  const onScanCode = (code: string) => {
    if (code) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('verified', 'true')
      router.push(`?${params.toString()}`)
      setIsScanning(false)
      toast.success('アクセス権限認証完了')
    }
  }

  const handleAction = async () => {
    if (!selectedTeam) return

    setLoading(true)
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: node.id, teamName: selectedTeam })
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'エラーが発生しました')
      } else {
        if (data.success) {
          toast.success(data.message)
          setResult(data)
          setProgress(0) // Reset progress
          router.refresh()
        } else {
           toast.info(data.message)
           setProgress(0)
        }
      }
    } catch (e) {
      console.error(e)
      toast.error('通信エラーが発生')
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  // Hold Handlers
  const startHold = () => {
    if (loading || result) return
    setHolding(true)
    let p = 0
    holdInterval.current = setInterval(() => {
      p += 2 // Speed of capture
      if (p >= 100) {
        if (holdInterval.current) clearInterval(holdInterval.current)
        setHolding(false)
        handleAction()
      } else {
        setProgress(p)
      }
    }, 20) // Update every 20ms
  }

  const stopHold = () => {
    if (loading) return
    if (holdInterval.current) clearInterval(holdInterval.current)
    setHolding(false)
    setProgress(0)
  }

  const currentTeam = teams.find(t => t.name === selectedTeam)

  if (!selectedTeam) {
    return (
      <Card className="w-full max-w-md bg-zinc-900 border-none text-white relative">
        <div className="absolute inset-0 border border-zinc-700 clip-path-polygon pointer-events-none"></div>
        <CardContent className="space-y-6 pt-8 pb-8 px-6">
          <h2 className="text-center text-cyan-500 font-mono tracking-widest text-lg border-b border-cyan-500/30 pb-2">
            未確認ユニット検知
          </h2>
          <p className="text-center text-zinc-400 text-sm font-mono">
            所属する部隊を選択し、IFFコードを登録せよ。
          </p>
          <div className="grid grid-cols-2 gap-4">
            {teams.map(team => (
              <Button 
                key={team.id}
                onClick={() => handleSetTeam(team.name)}
                className="w-full h-16 text-lg font-bold border rounded-none relative overflow-hidden group hover:scale-[1.02] transition-transform"
                style={{ borderColor: team.color, color: team.color, backgroundColor: 'rgba(0,0,0,0.8)' }}
              >
                <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: team.color }}></div>
                {team.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isEnemy = node.controlledBy?.id && node.controlledBy?.name !== selectedTeam
  const isFriendly = node.controlledBy?.name === selectedTeam

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'MEAT': return '肉類 (MEAT)'
      case 'VEGETABLE': return '野菜 (VEG)'
      case 'RICE': return '穀物 (RICE)'
      case 'NOODLE': return '麺類 (NOODLE)'
      case 'BREAD': return 'パン (BREAD)'
      case 'SEAFOOD': return '魚介 (FISH)'
      case 'SPICE': return '香辛料 (SPICE)'
      case 'DAIRY': return '乳製品 (DAIRY)'
      default: return '物資 (UNKNOWN)'
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md relative font-mono">
      {/* Close Button */}
      <button 
        onClick={() => router.push('/game')}
        className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-sm border border-white/10 shadow-lg active:scale-95"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      {/* Scanner Modal */}
      {isScanning && (
        <QRScanner 
          onScan={onScanCode} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {/* Header */}
      <div className="text-center w-full">
        <div className="flex items-center justify-center gap-2 mb-1 opacity-70">
           <div className="h-px w-8 bg-current"></div>
           <div className="text-xs text-cyan-400 tracking-[0.2em]">現在位置詳細</div>
           <div className="h-px w-8 bg-current"></div>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
          {node.name}
        </h1>
        <div className="mt-2 inline-flex items-center px-3 py-1 bg-zinc-900 border-l-2 border-r-2 border-zinc-700 text-xs text-zinc-300 gap-2">
           <span className="opacity-50">RESOURCE:</span>
           <span className="font-bold text-cyan-300">{getTypeLabel(node.type)}</span>
        </div>
      </div>

      {/* Controller Status */}
      <Card className="w-full bg-black/60 backdrop-blur border-none text-white relative overflow-hidden">
        {/* Status Bar */}
        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: node.controlledBy?.color || '#555' }}></div>
        <div className="absolute top-0 right-0 w-1.5 h-full" style={{ backgroundColor: node.controlledBy?.color || '#555' }}></div>
        
        <CardContent className="pt-6 relative z-10">
           <div className="flex flex-col items-center">
             <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-1">CURRENT CONTROL</span>
             {node.controlledBy ? (
               <motion.span 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-3xl font-bold flex items-center gap-3 drop-shadow-md" 
                 style={{ color: node.controlledBy.color }}
               >
                 <Shield className="w-6 h-6" />
                 {node.controlledBy.name}
               </motion.span>
             ) : (
               <span className="text-3xl font-bold text-zinc-500 tracking-widest">NEUTRAL</span>
             )}
             <div className="mt-2 h-px w-full bg-linear-to-r from-transparent via-zinc-700 to-transparent"></div>
           </div>
        </CardContent>
      </Card>

      {/* Action Area */}
      <div className="w-full relative px-2">
         {!isVerified ? (
           <Button 
             onClick={() => setIsScanning(true)}
             className="w-full h-32 border border-zinc-700 bg-[linear-gradient(45deg,transparent_5%,rgba(20,20,20,0.9)_5%,rgba(20,20,20,0.9)_95%,transparent_95%)] text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/50 transition-all group"
           >
             <div className="flex flex-col items-center gap-2">
                <Lock className="w-8 h-8 opacity-50 group-hover:animate-pulse" />
                <span className="text-lg font-bold tracking-widest">ACCESS DENIED</span>
                <span className="text-xs font-normal opacity-50 font-mono">SECURITY LOCK ACTIVE<br/>CLICK TO SCAN KEY</span>
             </div>
           </Button>
         ) : (
           /* Secure Action Button (Hold to Execute) */
           <div className="relative w-full h-32 select-none touch-none filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
             {/* Main Frame */}
             <div 
               className={`absolute inset-0 clip-path-button transition-colors duration-300 bg-black/80 border-2`}
               style={{ 
                 borderColor: isFriendly ? '#00ff00' : (isEnemy ? '#ff0000' : '#888'),
                 boxShadow: holding ? '0 0 30px rgba(255,255,255,0.1) inset' : 'none'
               }}
             />
             
             {/* Progress Fill */}
             <div className="absolute inset-0 clip-path-button overflow-hidden">
                <motion.div 
                  className="absolute inset-0" 
                  initial={{ x: '-100%' }}
                  animate={{ x: `${progress - 100}%` }}
                  transition={{ duration: 0 }}
                  style={{ backgroundColor: isFriendly ? '#00ff00' : '#ff0000', opacity: 0.2 }}
                />
             </div>

             {/* Button Interaction Layer */}
             <button
               className="absolute inset-0 w-full h-full flex flex-col items-center justify-center outline-none active:scale-[0.98] transition-transform z-20"
               onMouseDown={startHold}
               onMouseUp={stopHold}
               onMouseLeave={stopHold}
               onTouchStart={startHold}
               onTouchEnd={stopHold}
             >
                <div className="relative flex flex-col items-center gap-1 pointer-events-none">
                   {loading ? (
                     <span className="animate-pulse text-yellow-400 font-bold tracking-widest">PROCESSING...</span>
                   ) : (
                     <>
                        <Crosshair className={`w-8 h-8 mb-1 ${holding ? 'animate-spin text-white' : 'text-zinc-500'}`} />
                        <span className="text-2xl font-black tracking-[0.2em] font-mono" style={{ color: isFriendly ? '#00ff00' : (isEnemy ? '#ff0000' : '#fff') }}>
                          {holding ? 'EXECUTING...' : (isFriendly ? 'HARVEST' : 'CAPTURE')}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] uppercase opacity-70 mt-1">
                           <span className={`w-2 h-2 rounded-full ${holding ? 'bg-red-500 animate-ping' : 'bg-zinc-600'}`}></span>
                           {isFriendly ? 'RESOURCE COLLECTION PROTOCOL' : 'TERRITORY CONTROL PROTOCOL'}
                        </div>
                     </>
                   )}
                </div>
             </button>
             
             {/* Decor Corners */}
             <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/30"></div>
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/30"></div>
           </div>
         )}
      </div>

      {/* Result Display */}
      {result && (
        <div className="mt-4 p-4 w-full bg-zinc-900 border border-t-4 border-t-yellow-400 text-sm animate-in fade-in slide-in-from-bottom-4 shadow-lg">
          <div className="font-bold mb-1 flex items-center gap-2 text-yellow-400">
            <Zap className="w-4 h-4" />
            SYSTEM MESSAGE:
          </div>
          <div className="text-zinc-300">{result.message}</div>
        </div>
      )}

      {/* Team Info / Switch */}
      <div className="mt-12 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
         <span className="text-[10px] text-zinc-600 tracking-widest">OPERATING UNIT:</span>
         <span className="font-bold text-sm tracking-widest" style={{ color: currentTeam?.color }}>{selectedTeam}</span>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, ChevronRight } from 'lucide-react'

type Team = {
  id: string
  name: string
  color: string
  score: number
}

export default function LandingClient({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 1. Check URL Param
    const teamParam = searchParams.get('team')
    if (teamParam) {
       // Validate
       const exists = teams.find(t => t.name === teamParam)
       if (exists) {
         localStorage.setItem('my-team', teamParam)
         router.push(`/game?team=${teamParam}`)
         return
       }
    }

    // 2. Check LocalStorage
    const stored = localStorage.getItem('my-team')
    if (stored) {
       router.push(`/game?team=${stored}`)
       return
    }

    setChecking(false)
  }, [teams, router, searchParams])

  const handleSelect = (teamName: string) => {
    localStorage.setItem('my-team', teamName)
    router.push(`/game?team=${teamName}`)
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 font-mono">
        <div className="animate-pulse text-cyan-500 text-xl tracking-widest">INITIALIZING...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 relative overflow-hidden p-6 font-mono">
       {/* Background */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-size-[100%_2px,3px_100%] pointer-events-none opacity-50"></div>
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-1 pointer-events-none"></div>

       <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
             <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-2" style={{ textShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
               TACTICAL MAP<span className="text-cyan-500">.OS</span>
             </h1>
             <p className="text-zinc-500 tracking-[0.3em] text-sm md:text-base">SECURE TERRAIN / HARVEST RESOURCES</p>
          </motion.div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {teams.map((team, idx) => (
              <motion.button
                key={team.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleSelect(team.name)}
                className="group relative h-32 md:h-40 w-full text-left overflow-hidden border-2 border-zinc-800 hover:border-white transition-all bg-zinc-900/50 backdrop-blur-sm active:scale-[0.98]"
              >
                 {/* Color Bar */}
                 <div className="absolute top-0 left-0 w-2 h-full transition-all group-hover:w-4" style={{ backgroundColor: team.color }}></div>
                 
                 {/* Content */}
                 <div className="absolute inset-0 flex items-center justify-between px-8 pl-10">
                    <div>
                       <div className="text-xs text-zinc-500 mb-1 tracking-widest">UNIT {idx + 1}</div>
                       <div className="text-3xl font-bold uppercase flex items-center gap-3" style={{ color: team.color }}>
                          <Shield className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                          {team.name}
                       </div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-zinc-700 group-hover:text-white transition-colors group-hover:translate-x-1 duration-300" />
                 </div>

                 {/* Hover Effect */}
                 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </motion.button>
            ))}
          </div>
          
          <div className="mt-12 text-xs text-zinc-700 font-mono">
            SYSTEM VERSION 2.0.4 // CONNECTION SECURE
          </div>
       </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, ChevronRight, Eye } from 'lucide-react'

type Team = {
  id: string
  name: string
  color: string
  score: number
}

export default function LandingClient({ teams }: { teams: Team[] }) {
  const router = useRouter()

  const handleSelect = (teamName: string) => {
    localStorage.setItem('my-team', teamName)
    router.push(`/game?team=${teamName}`)
  }

  const handleSpectator = () => {
    router.push('/game?mode=spectator')
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-zinc-950 relative overflow-y-auto overflow-x-hidden p-4 font-mono pb-safe">
       {/* Background */}
       <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-size-[100%_2px,3px_100%] pointer-events-none opacity-50"></div>
       <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-1 pointer-events-none"></div>

       <div className="relative z-10 w-full max-w-md flex flex-col items-center py-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
             <h1 className="text-3xl font-black text-white tracking-tighter mb-1" style={{ textShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
               TACTICAL MAP<span className="text-cyan-500">.OS</span>
             </h1>
             <p className="text-zinc-400 tracking-[0.2em] text-xs">UNIT SELECTION</p>
          </motion.div>

          {/* Team Grid - Vertical Stack for Mobile */}
          <div className="flex flex-col gap-4 w-full">
            {teams.map((team, idx) => (
              <motion.button
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelect(team.name)}
                className="group relative h-24 w-full text-left overflow-hidden border-2 border-zinc-800 hover:border-white transition-all bg-zinc-900/80 backdrop-blur-sm active:scale-[0.98] rounded-sm"
              >
                 {/* Color Bar */}
                 <div className="absolute top-0 left-0 w-3 h-full transition-all group-hover:w-6" style={{ backgroundColor: team.color }}></div>
                 
                 {/* Content */}
                 <div className="absolute inset-0 flex items-center justify-between px-6 pl-8">
                    <div>
                       <div className="text-[10px] text-zinc-400 mb-1 tracking-widest">UNIT 0{idx + 1}</div>
                       <div className="text-2xl font-bold uppercase flex items-center gap-3 text-white" style={{ textShadow: `0 0 10px ${team.color}66` }}>
                          <Shield className="w-6 h-6" style={{ color: team.color }} />
                          {team.name}
                       </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors group-hover:translate-x-1 duration-300" />
                 </div>
              </motion.button>
            ))}

            {/* Spectator Mode */}
             <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: teams.length * 0.05 }}
                onClick={handleSpectator}
                className="group relative h-20 w-full text-left overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-all bg-zinc-950/50 backdrop-blur-sm active:scale-[0.98] mt-4 rounded-sm"
              >
                 {/* Content */}
                 <div className="absolute inset-0 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600">
                          <Eye className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                       </div>
                       <div>
                          <div className="text-lg font-bold text-zinc-400 group-hover:text-zinc-200">SPECTATOR MODE</div>
                          <div className="text-[10px] text-zinc-600 tracking-wider">VIEW ONLY ACCESS</div>
                       </div>
                    </div>
                 </div>
              </motion.button>
          </div>
          
          <div className="mt-12 text-[10px] text-zinc-600 font-mono">
            SYSTEM VERSION 2.1.0 // CONNECTION SECURE
          </div>
       </div>
    </div>
  )
}

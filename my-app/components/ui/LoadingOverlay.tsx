'use client'

import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-500 font-mono">
      <div className="relative">
        <Loader2 className="w-16 h-16 animate-spin" />
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 text-xl tracking-widest font-black animate-pulse"
      >
        SYSTEM PROCESSING...
      </motion.div>
      <div className="mt-2 text-xs text-cyan-700">ESTABLISHING SECURE CONNECTION</div>
      
      {/* Decorative scanline */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px] opacity-20"></div>
    </div>
  )
}

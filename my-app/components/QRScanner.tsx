'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface QRScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [paused, setPaused] = useState(false)

  const handleScan = (detected: any[]) => {
    if (paused) return
    if (detected && detected.length > 0) {
      const value = detected[0].rawValue
      setPaused(true)
      onScan(value)
      // Auto-pause to prevent duplicate scans immediately
      setTimeout(() => setPaused(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 border-b border-white/10 z-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-500 font-mono text-sm tracking-widest">SYSTEM ACTIVE</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center p-4">
        {/* Scanner Container with specific aspect ratio for mobile friendliness */}
        <div className="relative w-full max-w-md aspect-square overflow-hidden border-2 border-slate-800 rounded-lg bg-black">
             <Scanner 
                onScan={handleScan}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
             />
             
             {/* HUD Overlay */}
             <div className="absolute inset-0 pointer-events-none">
                {/* Crosshairs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-500/30 rounded-lg">
                   <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                   <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
                   <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
                   <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>
                   
                   {/* Scanning Line Animation */}
                   <motion.div 
                     className="absolute left-0 right-0 h-[2px] bg-cyan-500/80 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                     animate={{ top: ['0%', '100%', '0%'] }}
                     transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                   />
                </div>

                {/* Status Text */}
                <div className="absolute bottom-10 left-0 right-0 text-center">
                  <span className="inline-block bg-cyan-500/10 border border-cyan-500/50 px-4 py-1 text-cyan-400 font-mono text-xs tracking-[0.2em] animate-pulse">
                    SCANNING TARGET ID...
                  </span>
                </div>
             </div>
        </div>
        
        <p className="mt-8 text-zinc-500 text-sm max-w-xs text-center font-mono">
          Align unit QR code within the frame to initiate protocol.
        </p>
      </div>
    </div>
  )
}

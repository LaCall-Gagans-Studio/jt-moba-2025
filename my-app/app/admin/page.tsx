'use client'

import { useState } from 'react'
import { toast } from 'sonner' // Assuming sonner is installed or will be

// Simple Admin Component
export default function AdminPage() {
  const [loading, setLoading] = useState(false)

  // This is a placeholder as the user requested clicking map to add nodes.
  // Implementing a full map click-to-add requires capturing coordinates.
  // For simplicity MVP, I'll provide a form here OR a map view that logs clicks.
  
    const name = prompt("Node Name:")
    if (!name) return
    const type = prompt("Type (MEAT, VEGETABLE, AMMO):", "AMMO")
    if (!type) return

    setLoading(true)
    try {
        const res = await fetch('/api/admin/node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, x, y })
        })
        const data = await res.json()
        if (data.success) {
            toast.success(`Created ${name}!`)
        } else {
            toast.error('Failed')
        }
    } catch (e) {
        console.error(e)
        toast.error('Error')
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">ADMIN: FIELD MAKER</h1>
      <p className="mb-4">Click anywhere on the map area below to define a coordinate.</p>
      
      <div 
        className="relative w-full aspect-video bg-neutral-800 border-2 border-dashed border-zinc-600 cursor-crosshair hover:bg-neutral-700 transition"
        onClick={handleMapClick}
      >
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none">
          Click to Log Checkpoint (X/Y)
        </div>
      </div>
    </div>
  )
}

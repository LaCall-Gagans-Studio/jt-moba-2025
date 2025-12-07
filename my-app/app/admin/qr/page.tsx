'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code' // using default export usually
import { Printer } from 'lucide-react'

type Node = {
  id: string
  name: string
  type: string
  secretKey: string
}

export default function QRPrintPage() {
  const [nodes, setNodes] = useState<Node[]>([])

  useEffect(() => {
    fetch('/api/admin/node')
      .then(res => res.json())
      .then(data => setNodes(data))
  }, [])

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
    <div className="min-h-screen bg-white text-black p-8 font-sans">
        {/* Helper Header for Print */}
        <div className="print:hidden mb-8 flex items-center justify-between bg-zinc-100 p-4 rounded border">
            <div>
                <h1 className="text-xl font-bold">QR Code Print Sheet</h1>
                <p className="text-sm text-zinc-500">Use A4 paper. Header will be hidden on print.</p>
            </div>
            <button 
                onClick={() => window.print()}
                className="bg-black text-white px-6 py-2 rounded flex items-center gap-2 font-bold hover:bg-zinc-800"
            >
                <Printer size={18} /> PRINT
            </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 print:grid-cols-2 print:gap-4">
            {nodes.map(node => (
                <div key={node.id} className="border-4 border-black p-6 flex flex-col items-center justify-center aspect-[1/1.2] relative break-inside-avoid shadow-sm print:shadow-none">
                    
                    {/* Header */}
                    <div className="text-center w-full border-b-2 border-black pb-4 mb-4">
                        <div className="text-6xl mb-2">{getTypeIcon(node.type)}</div>
                        <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">{node.name}</h2>
                        <span className="text-xs font-bold bg-black text-white px-2 py-0.5 rounded mt-1 inline-block">{node.type}</span>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-2">
    <QRCode
        value={JSON.stringify({ id: node.id, secret: node.secretKey })}
        size={180}
        viewBox={`0 0 256 256`}
        level="H"
    />
                    </div>

                    {/* Footer ID */}
                    <div className="mt-4 text-[10px] font-mono text-zinc-400 text-center uppercase tracking-widest">
                        ID: {node.id.split('-')[0]}...
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}

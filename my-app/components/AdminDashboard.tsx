'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Map, List, Edit2, Trash2, Plus, Save, Printer, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type Node = {
  id: string
  name: string
  type: string
  x: number
  y: number
  captureRate: number
}

export default function AdminDashboard() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'CREATE' | 'EDIT'>('CREATE')

  const [formData, setFormData] = useState({
    name: '',
    type: 'MEAT',
    captureRate: 10,
    x: 50,
    y: 50
  })

  useEffect(() => {
    fetchNodes()
  }, [])

  const fetchNodes = async () => {
    const res = await fetch('/api/admin/node')
    const data = await res.json()
    setNodes(data)
  }

  const handleSelect = (node: Node) => {
    setSelectedNode(node)
    setFormData({
      name: node.name,
      type: node.type,
      captureRate: node.captureRate,
      x: node.x,
      y: node.y
    })
    setMode('EDIT')
  }

  const handleNew = () => {
    setSelectedNode(null)
    setFormData({
      name: '',
      type: 'MEAT',
      captureRate: 10,
      x: 50,
      y: 50
    })
    setMode('CREATE')
  }

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // Update form data coordinate
    setFormData(prev => ({ ...prev, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }))
  }

  const handleSubmit = async () => {
    if (!formData.name) return toast.error('Check fields')
    setLoading(true)

    try {
      if (mode === 'CREATE') {
        const res = await fetch('/api/admin/node', {
            method: 'POST',
            body: JSON.stringify(formData)
        })
        if (res.ok) {
            toast.success('Created!')
            handleNew()
            fetchNodes()
        }
      } else if (mode === 'EDIT' && selectedNode) {
        const res = await fetch(`/api/admin/node/${selectedNode.id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        })
        if (res.ok) {
            toast.success('Updated!')
            fetchNodes()
        }
      }
    } catch (e) {
        toast.error('Error')
    } finally {
        setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNode || !confirm("Delete this node?")) return
    setLoading(true)
    try {
        await fetch(`/api/admin/node/${selectedNode.id}`, { method: 'DELETE' })
        toast.success('Deleted')
        handleNew()
        fetchNodes()
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row font-mono">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-zinc-800 flex flex-col h-[50vh] md:h-screen">
         <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <h1 className="font-bold text-cyan-400">NODE LIST</h1>
            <div className="flex gap-2">
                <Link href="/admin/qr" target="_blank">
                    <button className="p-2 hover:bg-zinc-800 rounded text-zinc-400" title="Print QR">
                        <Printer size={16} />
                    </button>
                </Link>
                <button onClick={handleNew} className="p-2 hover:bg-zinc-800 rounded text-green-400" title="New Node">
                    <Plus size={16} />
                </button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {nodes.map(node => (
                <div 
                    key={node.id}
                    onClick={() => handleSelect(node)}
                    className={`p-3 rounded cursor-pointer border transition-all ${selectedNode?.id === node.id ? 'bg-zinc-800 border-cyan-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm">{node.name}</span>
                        <span className="text-[10px] bg-black px-1 rounded text-zinc-400">{node.type}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                        R:{node.captureRate} / x:{node.x.toFixed(0)} y:{node.y.toFixed(0)}
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[50vh] md:h-screen overflow-hidden">
         {/* Map Editor */}
         <div className="flex-1 relative bg-zinc-900 overflow-hidden group border-b border-zinc-800">
            <div 
                className="relative w-full h-full cursor-crosshair"
                onClick={handleMapClick}
            >
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img 
                      src="/map.jpg" 
                      alt="Map" 
                      className="w-full h-full object-cover opacity-50"
                    />
                </div>
                
                {/* Grid Overlay */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ 
                       backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)', 
                       backgroundSize: '50px 50px' 
                     }}
                />

                {/* Nodes on Map */}
                {nodes.map(node => (
                    <div 
                        key={node.id}
                        className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${selectedNode?.id === node.id ? 'bg-cyan-500 border-white z-20 scale-125' : 'bg-black/50 border-zinc-500 z-10'}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    />
                ))}

                {/* Current Edit Indicator */}
                <div 
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-green-500 rounded-full animate-ping pointer-events-none"
                    style={{ left: `${formData.x}%`, top: `${formData.y}%` }}
                />
            </div>

            <div className="absolute bottom-4 left-4 bg-black/80 p-2 text-xs text-zinc-400 backdrop-blur-sm pointer-events-none">
                CLICK MAP TO MOVE CURSOR
            </div>
         </div>

         {/* Editor Form */}
         <div className="h-auto p-6 bg-zinc-950 border-t border-zinc-800">
            <div className="flex items-end gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">NAME</label>
                    <input 
                        className="bg-zinc-900 border border-zinc-700 p-2 rounded w-48 text-white focus:border-cyan-500 outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">TYPE</label>
                    <select 
                        className="bg-zinc-900 border border-zinc-700 p-2 rounded w-32 text-white focus:border-cyan-500 outline-none"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="MEAT">MEAT</option>
                        <option value="VEGETABLE">VEGETABLE</option>
                        <option value="SPICE">SPICE</option>
                        <option value="WATER">WATER</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">RATE</label>
                    <input 
                        type="number"
                        className="bg-zinc-900 border border-zinc-700 p-2 rounded w-20 text-white focus:border-cyan-500 outline-none"
                        value={formData.captureRate}
                        onChange={e => setFormData({...formData, captureRate: Number(e.target.value)})}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">POS (X/Y)</label>
                    <div className="flex gap-1">
                        <input 
                             type="number"
                             className="bg-zinc-900 border border-zinc-700 p-2 rounded w-16 text-xs text-white"
                             value={formData.x}
                             readOnly
                        />
                        <input 
                             type="number"
                             className="bg-zinc-900 border border-zinc-700 p-2 rounded w-16 text-xs text-white"
                             value={formData.y}
                             readOnly
                        />
                    </div>
                </div>

                <div className="flex gap-2 ml-auto">
                    {mode === 'EDIT' && (
                        <button 
                            onClick={handleDelete}
                            disabled={loading}
                            className="bg-red-900/50 border border-red-500 text-red-100 px-4 py-2 rounded hover:bg-red-800 transition flex items-center gap-2"
                        >
                            <Trash2 size={16} /> DELETE
                        </button>
                    )}
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-cyan-900/50 border border-cyan-500 text-cyan-100 px-6 py-2 rounded hover:bg-cyan-800 transition flex items-center gap-2 font-bold"
                    >
                        <Save size={16} /> {mode === 'CREATE' ? 'CREATE NODE' : 'UPDATE NODE'}
                    </button>
                </div>
            </div>
         </div>
      </div>
    </div>
  )
}

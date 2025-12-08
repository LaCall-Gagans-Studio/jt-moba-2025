'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Printer, RefreshCw, Trash2, Shield, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Node = {
  id: string
  name: string
  type: string
  x: number
  y: number
  captureRate: number
  controlledById: string | null
}

type TeamResource = {
  type: string
  amount: number
}

type Team = {
  id: string
  name: string
  color: string
  score: number
  _count: { nodes: number }
  resources: TeamResource[]
}

export default function AdminDashboard() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [teams, setTeams] = useState<Team[]>([])
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

  // データ取得
  const fetchData = async () => {
    try {
      const [resNodes, resTeams] = await Promise.all([
        fetch('/api/admin/node').then(r => r.json()),
        fetch('/api/admin/team').then(r => r.json())
      ])
      setNodes(resNodes)
      setTeams(resTeams)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
    // リアルタイム更新（10秒ごと）
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  // フォーム操作系
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
    setFormData(prev => ({ ...prev, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }))
  }

  const handleSubmit = async () => {
    if (!formData.name) return toast.error('名前を入力してください')
    setLoading(true)
    try {
      const url = mode === 'CREATE' ? '/api/admin/node' : `/api/admin/node/${selectedNode?.id}`
      const method = mode === 'CREATE' ? 'POST' : 'PUT'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        toast.success(mode === 'CREATE' ? '作成しました' : '更新しました')
        if (mode === 'CREATE') handleNew()
        fetchData()
      } else {
        toast.error('エラーが発生しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNode || !confirm("本当に削除しますか？")) return
    setLoading(true)
    try {
        await fetch(`/api/admin/node/${selectedNode.id}`, { method: 'DELETE' })
        toast.success('削除しました')
        handleNew()
        fetchData()
    } finally {
        setLoading(false)
    }
  }

  // ゲーム進行操作系
  const handleGameControl = async (action: 'START' | 'RESET') => {
    if (action === 'RESET' && !confirm('警告: 全チームのスコア、資源、ログが完全に消去されます。\n本当によろしいですか？')) return
    
    setLoading(true)
    try {
        await fetch('/api/admin/control', {
            method: 'POST',
            body: JSON.stringify({ action })
        })
        toast.success(`Game ${action} Executed`)
        if (action === 'RESET') fetchData()
    } catch (e) {
        toast.error('実行エラー')
    } finally {
        setLoading(false)
    }
  }

  const handleForceTick = async () => {
    if(!confirm('1分経過させますか？（資源が加算されます）')) return
    try {
        await fetch('/api/game/tick', { method: 'POST' })
        toast.success('Tick処理完了')
        fetchData()
    } catch(e) { toast.error('Tickエラー') }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row font-mono text-xs">
       {/* Sidebar List */}
       <div className="w-full md:w-72 border-r border-zinc-800 flex flex-col h-[40vh] md:h-screen">
         <div className="p-4 border-b border-zinc-800 bg-zinc-900">
            <h1 className="font-bold text-cyan-400 mb-4 text-sm">ADMIN CONSOLE</h1>
            
            {/* Game Control Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => handleGameControl('START')} className="bg-green-900/30 border border-green-600 text-green-100 p-2 rounded hover:bg-green-800 transition flex justify-center items-center gap-1">
                    START
                </button>
                <button onClick={() => handleGameControl('RESET')} className="bg-red-900/30 border border-red-600 text-red-100 p-2 rounded hover:bg-red-800 transition flex justify-center items-center gap-1">
                    RESET
                </button>
            </div>

            <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-500 font-bold">NODES ({nodes.length})</span>
                <div className="flex gap-1">
                     <Link href="/admin/qr" target="_blank">
                        <button className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 border border-zinc-700" title="QR印刷">
                            <Printer size={14} />
                        </button>
                    </Link>
                    <button onClick={handleForceTick} className="p-1.5 hover:bg-zinc-700 rounded text-amber-500 border border-zinc-700" title="時間経過">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={handleNew} className="p-1.5 hover:bg-zinc-700 rounded text-green-400 border border-zinc-700" title="新規作成">
                        <Plus size={14} />
                    </button>
                </div>
            </div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {nodes.map(node => (
                <div 
                    key={node.id}
                    onClick={() => handleSelect(node)}
                    className={`p-2 rounded cursor-pointer border transition-all ${selectedNode?.id === node.id ? 'bg-zinc-800 border-cyan-500' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'}`}
                >
                    <div className="flex justify-between items-center">
                        <span className="font-bold truncate w-24">{node.name}</span>
                        <span className="bg-black px-1 rounded text-zinc-400 scale-90">{node.type}</span>
                    </div>
                    <div className="text-zinc-600 mt-1 flex justify-between">
                        <span>R:{node.captureRate}</span>
                        {node.controlledById ? <span className="text-red-500">OCCUPIED</span> : <span className="text-green-900">FREE</span>}
                    </div>
                </div>
            ))}
         </div>
       </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-screen overflow-hidden">
         {/* Resource Stats */}
         <div className="h-1/3 bg-zinc-900 border-b border-zinc-800 overflow-auto p-4">
            <h2 className="text-zinc-500 mb-2 font-bold flex items-center gap-2">
                <Shield size={14} /> MISSION STATUS
            </h2>
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="border-b border-zinc-700 text-zinc-500">
                        <th className="p-2">TEAM</th>
                        <th className="p-2">SCORE</th>
                        <th className="p-2">NODE</th>
                        <th className="p-2">🍖 MEAT</th>
                        <th className="p-2">🥬 VEG</th>
                        <th className="p-2">🍚 RICE</th>
                        <th className="p-2">🍜 NODL</th>
                        <th className="p-2">🥖 BRED</th>
                        <th className="p-2">🦐 FISH</th>
                        <th className="p-2">🌶️ SPIC</th>
                        <th className="p-2">🧀 DARY</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((team) => {
                        const getRes = (type: string) => team.resources.find((r) => r.type === type)?.amount || 0
                        return (
                            <tr key={team.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                                <td className="p-2 font-bold" style={{color: team.color}}>{team.name}</td>
                                <td className="p-2 font-mono text-cyan-400 font-bold">{team.score.toLocaleString()}</td>
                                <td className="p-2">{team._count.nodes}</td>
                                <td className="p-2 text-zinc-400">{getRes('MEAT')}</td>
                                <td className="p-2 text-zinc-400">{getRes('VEGETABLE')}</td>
                                <td className="p-2 text-zinc-400">{getRes('RICE')}</td>
                                <td className="p-2 text-zinc-400">{getRes('NOODLE')}</td>
                                <td className="p-2 text-zinc-400">{getRes('BREAD')}</td>
                                <td className="p-2 text-zinc-400">{getRes('SEAFOOD')}</td>
                                <td className="p-2 text-zinc-400">{getRes('SPICE')}</td>
                                <td className="p-2 text-zinc-400">{getRes('DAIRY')}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
         </div>

         {/* Map Editor Area */}
         <div className="flex-1 relative bg-zinc-900 overflow-hidden group">
            <div 
                className="relative w-full h-full cursor-crosshair"
                onClick={handleMapClick}
            >
                <div className="absolute inset-0 bg-black">
                     <img src="/map.jpg" className="w-full h-full object-cover opacity-60" alt="" />
                </div>
                {/* Grid */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

                {nodes.map(node => (
                    <div 
                        key={node.id}
                        className={`absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${selectedNode?.id === node.id ? 'bg-cyan-500 border-white z-20 scale-150' : 'bg-black/80 border-zinc-500 z-10'} ${node.controlledById ? 'ring-2 ring-red-500' : ''}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    />
                ))}

                {/* Edit Cursor */}
                <div 
                    className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border border-dashed border-green-400 rounded-full pointer-events-none"
                    style={{ left: `${formData.x}%`, top: `${formData.y}%` }}
                />
            </div>
            
            {/* Editor Floating Form */}
            <div className="absolute bottom-0 w-full bg-zinc-950/90 border-t border-zinc-800 p-4 backdrop-blur-md">
                <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 scale-75 origin-left">NAME</label>
                        <input className="bg-black border border-zinc-700 p-1.5 rounded w-40 text-white focus:border-cyan-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 scale-75 origin-left">TYPE</label>
                        <select className="bg-black border border-zinc-700 p-1.5 rounded w-28 text-white focus:border-cyan-500 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                            {['MEAT','VEGETABLE','RICE','NOODLE','BREAD','SEAFOOD','SPICE','DAIRY'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-zinc-500 scale-75 origin-left">RATE</label>
                        <input type="number" className="bg-black border border-zinc-700 p-1.5 rounded w-16 text-white focus:border-cyan-500 outline-none" value={formData.captureRate} onChange={e => setFormData({...formData, captureRate: Number(e.target.value)})} />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                         {mode === 'EDIT' && (
                             <button onClick={handleDelete} className="bg-red-900/50 border border-red-500 text-red-100 px-3 py-2 rounded hover:bg-red-800 transition">
                                 <Trash2 size={16} />
                             </button>
                         )}
                         <button onClick={handleSubmit} className="bg-cyan-900/50 border border-cyan-500 text-cyan-100 px-4 py-2 rounded hover:bg-cyan-800 transition font-bold flex items-center gap-2">
                             <Save size={16} /> {mode === 'CREATE' ? '作成' : '更新'}
                         </button>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  )
}
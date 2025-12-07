'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function AdminPage() {
  const [loading, setLoading] = useState(false)

  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (loading) return

    // クリック位置から % 座標を計算
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // 簡易入力プロンプト
    const name = prompt("拠点名を入力してください:")
    if (!name) return

    const type = prompt("資源タイプを入力 (MEAT, VEGETABLE, SPICE, WATER):", "MEAT")
    if (!type) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: type.toUpperCase(), x, y })
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success(`拠点「${name}」を作成しました！`)
      } else {
        toast.error('作成に失敗しました')
      }
    } catch (err) {
      console.error(err)
      toast.error('通信エラー')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">ADMIN: FIELD MAKER</h1>
      <p className="mb-4 text-zinc-400">マップ上の任意の場所をクリックして、その座標に新しい拠点を設置します。</p>
      
      <div 
        className="relative w-full aspect-video bg-neutral-800 border-2 border-dashed border-zinc-600 cursor-crosshair hover:bg-neutral-700 transition overflow-hidden group"
        onClick={handleMapClick}
      >
        {/* グリッド線（見た目の目安用） */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)', 
               backgroundSize: '50px 50px' 
             }}
        />
        
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors">
          Click anywhere to add Node
        </div>
      </div>
    </div>
  )
}
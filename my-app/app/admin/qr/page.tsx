'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
        case 'MEAT': return '🍖'
        case 'VEGETABLE': return '🥬'
        case 'RICE': return '🍚'
        case 'NOODLE': return '🍜'
        case 'BREAD': return '🥖'
        case 'SEAFOOD': return '🦐'
        case 'SPICE': return '🌶️'
        case 'DAIRY': return '🧀'
        default: return '📦'
    }
}

  return (
    // 【修正点1】スクロール問題の解消
    // bodyのoverflow:hiddenを回避するため、ここで高さを固定して内部スクロールさせる
    <div className="h-screen w-full bg-white text-black font-sans overflow-y-auto print:h-auto print:overflow-visible">
        <div className="p-8">
            
            {/* Helper Header for Print */}
            <div className="print:hidden mb-8 flex items-center justify-between bg-zinc-100 p-4 rounded border">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Link href="/admin" className="hover:bg-zinc-200 p-1 rounded transition">
                            <ArrowLeft size={20} />
                        </Link>
                        QR Code Print Sheet
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        印刷時はヘッダーとフッターが外されます<br/>
                        A4用紙1枚につき1つのQRコードが印刷されます。
                    </p>
                </div>
                <button 
                    onClick={() => window.print()}
                    className="bg-black text-white px-6 py-2 rounded flex items-center gap-2 font-bold hover:bg-zinc-800"
                >
                    <Printer size={18} /> PRINT
                </button>
            </div>

            {/* 【修正点2】印刷レイアウト
               print:block -> グリッド解除
               print:gap-0 -> 余白削除
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:block print:gap-0">
                {nodes.map(node => (
                    <div 
                        key={node.id} 
                        // 【修正点3】1ページ1枚設定
                        // print:h-screen -> 紙いっぱいの高さ
                        // print:break-after-page -> 次の要素は別ページへ
                        // print:border-none -> 印刷時は枠線を消す（任意）
                        className="
                            border-4 border-black p-6 flex flex-col items-center justify-center 
                            aspect-[1/1.2] relative shadow-sm bg-white
                            print:h-screen print:w-full print:aspect-auto print:border-none print:shadow-none print:break-after-page
                        "
                    >
                        
                        {/* Header */}
                        <div className="text-center w-full border-b-4 border-black pb-6 mb-8 print:border-b-8 print:mb-12">
                            {/* アイコンも印刷時は巨大化 */}
                            <div className="text-6xl mb-4 print:text-9xl">{getTypeIcon(node.type)}</div>
                            <h2 className="text-3xl font-black uppercase tracking-tight leading-tight print:text-6xl">{node.name}</h2>
                            <span className="text-sm font-bold bg-black text-white px-3 py-1 rounded mt-2 inline-block print:text-2xl print:px-6 print:py-2 print:mt-4">{node.type}</span>
                        </div>

                        {/* QR Code */}
                        {/* レスポンシブ対応：画面では250px、印刷時は600pxまで拡大 */}
                        <div className="bg-white p-4 w-full max-w-[250px] print:max-w-[600px]">
                            <QRCode
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                value={JSON.stringify({ id: node.id, secret: node.secretKey })}
                                viewBox={`0 0 256 256`}
                                level="H"
                            />
                        </div>

                        {/* Footer ID */}
                        <div className="mt-6 text-xs font-mono text-zinc-400 text-center uppercase tracking-widest print:text-xl print:text-black print:mt-12">
                            ID: {node.id.split('-')[0]}...
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
}
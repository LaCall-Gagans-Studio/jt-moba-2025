"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { pusherClient } from "@/lib/pusher";
import { format } from "date-fns";
import { Radio, Target, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import QRScanner from "./QRScanner";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import LoadingOverlay from "./ui/LoadingOverlay";

// --- Types ---
type Team = {
  id: string;
  name: string;
  color: string;
  score: number;
};

type Node = {
  id: string;
  name: string;
  x: number;
  y: number;
  type: string;
  controlledById: string | null;
  controlledBy?: Team | null;
  captureRate: number;
};

type AuditLog = {
  id: string;
  message: string;
  createdAt: Date;
  teamId: string | null;
  team?: Team | null;
  teamColor?: string;
};

interface ClientMapProps {
  initialNodes: any[];
  initialTeams: any[];
  initialLogs: any[];
}

// --- Icons Helper ---
const getTypeIcon = (type: string) => {
  switch (type) {
    case "MEAT":
      return "🍖";
    case "VEGETABLE":
      return "🥬";
    case "RICE":
      return "🍚";
    case "NOODLE":
      return "🍜";
    case "BREAD":
      return "🥖";
    case "SEAFOOD":
      return "🦐";
    case "SPICE":
      return "🌶️";
    case "DAIRY":
      return "🧀";
    default:
      return "📦";
  }
};

// --- Colors Helper ---
const getTeamColor = (teams: Team[], teamId: string | null) => {
  if (!teamId) return "#aaaaaa";
  const team = teams.find((t) => t.id === teamId);
  return team ? team.color : "#aaaaaa";
};

// --- Optimized Map Content Component (Memoized) ---
// このコンポーネントは nodes または teams が変わった時だけ再描画されます。
// ログの更新や他のState変更では再描画されません。
const MapContent = React.memo(
  ({
    nodes,
    teams,
    isSpectator,
    onNodeClick,
  }: {
    nodes: Node[];
    teams: Team[];
    isSpectator: boolean;
    onNodeClick: (e: React.MouseEvent, node: Node) => void;
  }) => {
    return (
      <div className="relative w-full h-full">
        <img
          src="/map.jpg"
          alt="Tactical Map"
          className="w-full h-auto block opacity-80"
          draggable={false}
          loading="eager" // 高速化: 即時読み込み
          decoding="async" // 高速化: 非同期デコード
        />

        {/* Grid Overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)",
            backgroundSize: "100px 100px",
          }}
        />

        {/* Territory Glow Layer - 軽量化版 */}
        {nodes.map((node) => {
          if (!node.controlledById) return null;
          const color = getTeamColor(teams, node.controlledById);
          return (
            <div
              key={`glow-${node.id}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: "800px", // サイズ縮小 (2000px -> 800px)
                height: "800px",
                // 重い mix-blend-mode を削除し、単純な透明度合成に変更
                background: `radial-gradient(circle closest-side, ${color} 0%, transparent 70%)`,
                opacity: 0.3,
                zIndex: 15,
                willChange: "transform", // GPU最適化
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const color = getTeamColor(teams, node.controlledById);
          return (
            <div
              key={node.id}
              onClick={(e) => onNodeClick(e, node)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 group z-20 ${
                isSpectator ? "cursor-default" : "cursor-pointer"
              }`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                willChange: "transform", // GPU最適化
              }}
            >
              <div className="relative flex flex-col items-center">
                {/* Pin Icon - 軽量化: 影などの装飾をCSSでシンプルに */}
                <div
                  className="w-24 h-24 clip-path-hexagon flex items-center justify-center bg-black/90 transition-transform duration-150 group-hover:scale-105 border-4"
                  style={{
                    borderColor: color,
                    color: color,
                  }}
                >
                  <span className="text-5xl">{getTypeIcon(node.type)}</span>
                </div>

                {/* Label */}
                <div className="mt-4" style={{ color: color }}>
                  <div className="text-base font-black uppercase tracking-widest bg-black/90 px-4 py-1 border border-current shadow-sm text-center whitespace-nowrap">
                    {node.name}
                  </div>
                  <div className="text-xs text-center bg-black/90 text-white px-2 mt-1 rounded-full inline-block font-bold border border-zinc-800">
                    {node.captureRate} kg/min
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) => {
    // 高速化: nodes と teams が変更されたときのみ再描画
    // （厳密な比較が必要なら JSON.stringify を使いますが、ここでは参照変更を検知させます）
    return prev.nodes === next.nodes && prev.teams === next.teams;
  }
);

MapContent.displayName = "MapContent";

// --- Main Component ---
export default function ClientMap({
  initialNodes,
  initialTeams,
  initialLogs,
}: ClientMapProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myTeam, setMyTeam] = useState<string>("");

  const router = useRouter();
  const searchParams = useSearchParams();

  const isSpectator = searchParams.get("mode") === "spectator";

  // 追加: マウント時にサーバーデータを再取得（キャッシュ対策）
  useEffect(() => {
    router.refresh();
  }, []);

  // Auto-Login via URL
  useEffect(() => {
    if (isSpectator) return;

    const teamParam = searchParams.get("team");
    if (teamParam) {
      const targetTeam = initialTeams.find((t) => t.name === teamParam);
      if (targetTeam) {
        localStorage.setItem("my-team", teamParam);

        // Defer state update to avoid synchronous setState warning
        setTimeout(() => {
          setMyTeam((prev) => {
            if (prev !== teamParam) {
              toast.success(`所属確認: ${teamParam}チーム`, {
                position: "top-center",
              });
              return teamParam;
            }
            return prev;
          });
        }, 0);
      }
    } else {
      const stored = localStorage.getItem("my-team");
      if (stored) {
        setTimeout(() => {
          setMyTeam((prev) => (prev !== stored ? stored : prev));
        }, 0);
      }
    }
  }, [searchParams, initialTeams, isSpectator]);

  const onGlobalScan = (data: string) => {
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.id && parsed.secret) {
          sessionStorage.setItem(`node-secret-${parsed.id}`, parsed.secret);
          setIsScanning(false);
          router.push(`/node/${parsed.id}`);
          toast.success("セキュリティ認証成功: アクセス権限取得");
          return;
        }
      } catch {
        console.log("Legacy format or invalid JSON");
      }
      toast.error("無効なQRコードです");
    }
  };

  // Refs for Pusher callbacks
  const teamsRef = useRef(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    const channel = pusherClient.subscribe("game-channel");

    channel.bind("map-update", (data: any) => {
      // Create a new array reference to trigger re-render correctly in Memo
      setNodes((prev) => [
        ...prev.map((n) =>
          n.id === data.nodeId
            ? {
                ...n,
                controlledById: data.teamId,
                controlledBy:
                  teamsRef.current.find((t) => t.id === data.teamId) ||
                  n.controlledBy,
              }
            : n
        ),
      ]);
    });

    channel.bind("score-update", (data: any) => {
      setTeams((prev) => [
        ...prev.map((t) =>
          t.id === data.teamId ? { ...t, score: data.newScore } : t
        ),
      ]);
    });

    channel.bind("log-new", (data: any) => {
      setLogs((prev) => {
        if (prev.some((log) => log.id === data.id)) return prev;
        return [
          {
            id: data.id,
            message: data.message,
            createdAt: new Date(data.createdAt),
            teamId: null,
            teamColor: data.teamColor,
          },
          ...prev,
        ].slice(0, 50);
      });
    });

    // 追加: リセットイベントのハンドリング
    channel.bind("game-reset", () => {
      toast.info("ゲームがリセットされました。再読み込みします...", {
        duration: 2000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });

    return () => {
      pusherClient.unsubscribe("game-channel");
    };
  }, []);

  // Node click handler (Memoized to prevent unnecessary re-renders)
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, node: Node) => {
      if (isSpectator) return;
      e.preventDefault();
      e.stopPropagation();
      setIsLoading(true);
      setTimeout(() => {
        router.push(`/node/${node.id}`);
      }, 0);
    },
    [isSpectator, router]
  );

  return (
    <div className="relative w-full h-screen text-white bg-zinc-950 overflow-hidden font-mono tracking-tight selection:bg-cyan-500/30">
      {isLoading && <LoadingOverlay />}

      {/* Screen Overlays */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-1 bg-size-[100%_2px,3px_100%] pointer-events-none opacity-50"></div>
      </div>

      {/* HUD Elements (Combined Header & Bar) */}
      <div className="absolute top-0 left-0 w-full z-30 flex flex-col pointer-events-none">
        {/* Header: backdrop-blur削除 -> bg-black/90で代用（高速化） */}
        <div className="w-full pt-safe-top px-4 pb-4 bg-gradient-to-b from-black via-black/90 to-transparent flex flex-wrap gap-2 justify-between items-start">
          {/* Status Card */}
          {isSpectator ? (
            <div className="flex items-center gap-3 bg-zinc-900 border-l-4 border-zinc-500 pl-3 pr-4 py-2 clip-path-polygon shadow-lg">
              <Eye className="w-5 h-5 text-zinc-400" />
              <div>
                <div className="text-[10px] text-zinc-400 leading-none mb-1 tracking-widest">
                  MODE
                </div>
                <div className="text-lg font-bold leading-none text-zinc-200">
                  SPECTATOR
                </div>
              </div>
            </div>
          ) : myTeam ? (
            <div className="flex items-center gap-3 bg-zinc-900 border-l-4 border-cyan-500 pl-3 pr-4 py-2 clip-path-polygon shadow-lg">
              <Radio className="w-4 h-4 text-cyan-500 animate-pulse" />
              <div>
                <div className="text-[10px] text-cyan-400 leading-none mb-1 tracking-widest">
                  CURRENT UNIT
                </div>
                <div className="text-lg font-bold leading-none text-white">
                  {myTeam}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-zinc-900 border-l-4 border-red-500 pl-3 pr-4 py-2 shadow-lg">
              <div className="text-red-500 font-bold animate-pulse tracking-widest">
                UNIT UNIDENTIFIED
              </div>
            </div>
          )}

          {/* Resource Ticker */}
          <div className="flex gap-2">
            {teams.map((team) => (
              <div key={team.id} className="relative group">
                {/* bg-black/90 に変更 */}
                <div
                  className="px-2 py-1 min-w-[60px] md:min-w-[80px] text-right border-b-2 bg-black/90 transition-all rounded-t-sm"
                  style={{ borderColor: team.color }}
                >
                  <span
                    className="block text-[8px] md:text-[10px] opacity-80 mb-0.5 font-bold"
                    style={{ color: team.color }}
                  >
                    {team.name}
                  </span>
                  <span
                    className="block text-sm md:text-xl font-bold font-mono tracking-tighter text-white"
                    style={{ textShadow: `0 0 10px ${team.color}99` }}
                  >
                    {team.score.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Territory Control Bar */}
        <div className="w-full h-2 flex bg-zinc-900/90 shadow-lg overflow-hidden border-y border-white/5 shrink-0">
          {(() => {
            const totalNodes = nodes.length;
            if (totalNodes === 0) return null;
            return teams.map((team) => {
              const count = nodes.filter(
                (n) => n.controlledById === team.id
              ).length;
              if (count === 0) return null;
              const width = (count / totalNodes) * 100;
              return (
                <div
                  key={team.id}
                  className="h-full transition-all duration-500 ease-in-out relative group"
                  style={{ width: `${width}%`, backgroundColor: team.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-shimmer" />
                </div>
              );
            });
          })()}
          <div className="flex-1 bg-zinc-800/30 h-full" />
        </div>
      </div>

      {/* Main Map Area */}
      <div className="absolute inset-0 z-10 w-full h-full bg-zinc-900">
        <TransformWrapper
          initialScale={0.5}
          minScale={0.2}
          maxScale={3}
          centerOnInit={true}
          limitToBounds={false}
          smooth={true}
          wheel={{ step: 0.1 }}
        >
          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-[2000px] !h-auto relative"
          >
            {/* Memoized Map Content */}
            <MapContent
              nodes={nodes}
              teams={teams}
              isSpectator={isSpectator}
              onNodeClick={handleNodeClick}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* FAB */}
      {!isSpectator && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setIsScanning(true)}
            // backdrop-blur-xl -> bg-black/80
            className="group relative w-20 h-20 rounded-full bg-black/80 text-cyan-300 border-2 border-cyan-400 flex items-center justify-center overflow-hidden transition-all hover:scale-105 active:scale-95 hover:bg-cyan-900 hover:text-white shadow-lg shadow-cyan-900/50"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/30 to-transparent animate-spin-slow opacity-0 group-hover:opacity-100" />
            <Target className="w-10 h-10 relative z-10" />
            <div className="absolute -bottom-8 right-full w-40 text-right mr-6 text-sm text-cyan-300 font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none bg-black/90 px-2 rounded">
              広域スキャン開始 &gt;&gt;
            </div>
          </button>
        </div>
      )}

      {/* Scanner Overlay */}
      {isScanning && !isSpectator && (
        <QRScanner onScan={onGlobalScan} onClose={() => setIsScanning(false)} />
      )}

      {/* Bottom Log */}
      <div className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/3 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pb-8 flex flex-col justify-end pointer-events-none z-20">
        <div className="flex items-center gap-2 mb-2 opacity-80 pl-4 border-l-2 border-green-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-green-400 tracking-widest font-bold">
            SYSTEM LOG // ENCRYPTED
          </span>
        </div>
        {/* backdrop-blur削除 -> bg-black/40 */}
        <div className="flex flex-col-reverse h-full overflow-hidden mask-image-gradient border-l border-zinc-700/50 pl-4 bg-black/40 rounded-r-lg">
          {logs.map((log) => (
            <div
              key={log.id}
              className="mb-2 text-xs font-mono flex items-start animate-in slide-in-from-left-5"
            >
              <span className="text-zinc-400 mr-3 shrink-0 font-bold">
                [{format(new Date(log.createdAt), "HH:mm:ss")}]
              </span>
              <span
                style={{
                  color: log.teamColor || "#ddd",
                  textShadow: log.teamColor
                    ? `0 0 10px ${log.teamColor}aa`
                    : "none",
                  fontWeight: "bold",
                }}
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

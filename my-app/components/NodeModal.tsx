"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Zap, Lock, Crosshair, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation"; // Needed for router.refresh() if we want to refresh map data? Or maybe we can just callback?

// Types
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

type NodeModalProps = {
  node: Node;
  teams: Team[];
  myTeam: string;
  secretKey?: string;
  onClose: () => void;
};

export default function NodeModal({
  node,
  teams,
  myTeam,
  secretKey,
  onClose,
}: NodeModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Hold-to-Capture State
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdInterval = useRef<NodeJS.Timeout | null>(null);

  // We don't need local team selection anymore since it's passed as myTeam
  // We assume myTeam is valid if passed.

  const router = useRouter();

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (holdInterval.current) clearInterval(holdInterval.current);
    };
  }, []);

  const handleAction = async () => {
    if (!myTeam) {
      toast.error("所属チームが不明です");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: node.id,
          teamName: myTeam,
          secret: secretKey,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Stop hold on error
        stopHold();
        toast.error(data.error || "エラーが発生しました");
      } else {
        if (data.success) {
          toast.success(data.message);
          setResult(data);
          setProgress(0); // Reset progress
          // We can trigger a refresh or let Pusher handle the update.
          // Since ClientMap listens to Pusher, it should update automatically?
          // But router.refresh() ensures data consistency if Pusher is missed or for other data.
          // However, router.refresh() reloads the page props.
          router.refresh();

          // Optionally close modal after success? Or let user see result?
          // User might want to see the "Captured" state.
          // If we refresh, the node prop might not update inside this existing component instance immediately
          // unless the parent re-renders and passes new node prop.
        } else {
          toast.info(data.message);
          setProgress(0);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("通信エラーが発生");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Hold Handlers
  const startHold = () => {
    if (loading || result) return;
    setHolding(true);
    let p = 0;
    holdInterval.current = setInterval(() => {
      p += 2; // Speed of capture
      if (p >= 100) {
        if (holdInterval.current) clearInterval(holdInterval.current);
        setHolding(false);
        handleAction();
      } else {
        setProgress(p);
      }
    }, 20); // Update every 20ms
  };

  const stopHold = () => {
    if (loading) return;
    if (holdInterval.current) clearInterval(holdInterval.current);
    setHolding(false);
    setProgress(0);
  };

  const currentTeam = teams.find((t) => t.name === myTeam);
  const isEnemy = node.controlledBy?.id && node.controlledBy?.name !== myTeam;
  const isFriendly = node.controlledBy?.name === myTeam;

  // Verification check: controlled by friendly OR we have the secret key
  const isVerified = isFriendly || !!secretKey;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MEAT":
        return "肉類 (MEAT)";
      case "VEGETABLE":
        return "野菜 (VEG)";
      case "RICE":
        return "穀物 (RICE)";
      case "NOODLE":
        return "麺類 (NOODLE)";
      case "BREAD":
        return "パン (BREAD)";
      case "SEAFOOD":
        return "魚介 (FISH)";
      case "SPICE":
        return "香辛料 (SPICE)";
      case "DAIRY":
        return "乳製品 (DAIRY)";
      default:
        return "物資 (UNKNOWN)";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <div className="flex flex-col items-center gap-6 relative font-mono">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-0 right-0 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all backdrop-blur-sm border border-white/10 shadow-lg active:scale-95"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-1 opacity-70">
                <div className="h-px w-8 bg-current"></div>
                <div className="text-xs text-cyan-400 tracking-[0.2em]">
                  現在位置詳細
                </div>
                <div className="h-px w-8 bg-current"></div>
              </div>
              <h1
                className="text-3xl font-black text-white uppercase tracking-tighter"
                style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
              >
                {node.name}
              </h1>
              <div className="mt-2 inline-flex items-center px-3 py-1 bg-zinc-900 border-l-2 border-r-2 border-zinc-700 text-xs text-zinc-300 gap-2">
                <span className="opacity-50">RESOURCE:</span>
                <span className="font-bold text-cyan-300">
                  {getTypeLabel(node.type)}
                </span>
              </div>
            </div>

            {/* Controller Status */}
            <Card className="w-full bg-black/80 backdrop-blur border-none text-white relative overflow-hidden">
              {/* Status Bar */}
              <div
                className="absolute top-0 left-0 w-1.5 h-full"
                style={{ backgroundColor: node.controlledBy?.color || "#555" }}
              ></div>
              <div
                className="absolute top-0 right-0 w-1.5 h-full"
                style={{ backgroundColor: node.controlledBy?.color || "#555" }}
              ></div>

              <CardContent className="pt-6 relative z-10">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-1">
                    CURRENT CONTROL
                  </span>
                  {node.controlledBy ? (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-bold flex items-center gap-3 drop-shadow-md"
                      style={{ color: node.controlledBy.color }}
                    >
                      <Shield className="w-6 h-6" />
                      {node.controlledBy.name}
                    </motion.span>
                  ) : (
                    <span className="text-3xl font-bold text-zinc-500 tracking-widest">
                      NEUTRAL
                    </span>
                  )}
                  <div className="mt-2 h-px w-full bg-linear-to-r from-transparent via-zinc-700 to-transparent"></div>
                </div>
              </CardContent>
            </Card>

            {/* Action Area */}
            <div className="w-full relative px-2">
              {isFriendly ? (
                /* Friendly Node: SECURED (No Actions) */
                <div className="w-full h-32 border border-green-900/50 bg-green-900/10 flex flex-col items-center justify-center gap-2">
                  <Shield className="w-10 h-10 text-green-500" />
                  <span className="text-green-400 text-xl font-bold tracking-widest">
                    SECURED
                  </span>
                  <span className="text-green-600/70 text-xs tracking-wider">
                    DEFENSE ACTIVE
                  </span>
                </div>
              ) : !isVerified ? (
                /* Enemy/Neutral Node Not Verified: LOCKED */
                <div className="w-full h-32 border border-red-900/50 bg-red-900/10 flex flex-col items-center justify-center gap-2">
                  <Lock className="w-10 h-10 text-red-500/50" />
                  <span className="text-red-500 text-xl font-bold tracking-widest">
                    LOCKED
                  </span>
                  <span className="text-red-400/50 text-xs tracking-wider text-center">
                    ACCESS DENIED
                  </span>
                </div>
              ) : (
                /* Enemy/Neutral Node Verified: CAPTURE */
                <div className="relative w-full h-32 select-none touch-none filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  {/* Main Frame */}
                  <div
                    className={`absolute inset-0 clip-path-button transition-colors duration-300 bg-black/80 border-2`}
                    style={{
                      borderColor: isEnemy ? "#ff0000" : "#888",
                      boxShadow: holding
                        ? "0 0 30px rgba(255,255,255,0.1) inset"
                        : "none",
                    }}
                  />

                  {/* Progress Fill */}
                  <div className="absolute inset-0 clip-path-button overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      initial={{ x: "-100%" }}
                      animate={{ x: `${progress - 100}%` }}
                      transition={{ duration: 0 }}
                      style={{ backgroundColor: "#ff0000", opacity: 0.2 }}
                    />
                  </div>

                  {/* Button Interaction Layer */}
                  <button
                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center outline-none active:scale-[0.98] transition-transform z-20"
                    onMouseDown={startHold}
                    onMouseUp={stopHold}
                    onMouseLeave={stopHold}
                    onTouchStart={startHold}
                    onTouchEnd={stopHold}
                  >
                    <div className="relative flex flex-col items-center gap-1 pointer-events-none">
                      {loading ? (
                        <span className="animate-pulse text-yellow-400 font-bold tracking-widest">
                          PROCESSING...
                        </span>
                      ) : (
                        <>
                          <Crosshair
                            className={`w-8 h-8 mb-1 ${
                              holding
                                ? "animate-spin text-white"
                                : "text-zinc-500"
                            }`}
                          />
                          <span
                            className="text-2xl font-black tracking-[0.2em] font-mono"
                            style={{ color: isEnemy ? "#ff0000" : "#fff" }}
                          >
                            {holding ? "EXECUTING..." : "CAPTURE"}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] uppercase opacity-70 mt-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                holding
                                  ? "bg-red-500 animate-ping"
                                  : "bg-red-900"
                              }`}
                            ></span>
                            TERRITORY CONTROL PROTOCOL
                          </div>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Decor Corners */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/30"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/30"></div>
                </div>
              )}
            </div>

            {/* Result Display */}
            {result && (
              <div className="mt-4 p-4 w-full bg-zinc-900 border border-t-4 border-t-yellow-400 text-sm animate-in fade-in slide-in-from-bottom-4 shadow-lg">
                <div className="font-bold mb-1 flex items-center gap-2 text-yellow-400">
                  <Zap className="w-4 h-4" />
                  SYSTEM MESSAGE:
                </div>
                <div className="text-zinc-300">{result.message}</div>
              </div>
            )}

            {/* Team Info */}
            <div className="mt-4 flex flex-col items-center gap-2 opacity-50">
              <span className="text-[10px] text-zinc-600 tracking-widest">
                OPERATING UNIT:
              </span>
              <span
                className="font-bold text-sm tracking-widest"
                style={{ color: currentTeam?.color }}
              >
                {myTeam}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

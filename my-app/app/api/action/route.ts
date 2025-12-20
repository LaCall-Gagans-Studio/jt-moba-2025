import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // シングルトンの方をインポート
import { pusherServer } from "@/lib/pusher";

// レスポンスをキャッシュしない設定
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodeId, teamName, secret } = body;

    // 1. 入力チェック
    if (!nodeId || !teamName || !secret) {
      return NextResponse.json(
        { error: "Missing nodeId, teamName or secret" },
        { status: 400 }
      );
    }

    // 2. データ取得
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: { controlledBy: true },
    });

    const team = await prisma.team.findUnique({
      where: { name: teamName },
    });

    // 3. 存在チェック
    if (!node || !team) {
      return NextResponse.json(
        { error: "Node or Team not found" },
        { status: 404 }
      );
    }

    // 認証チェック
    if (node.secretKey !== secret) {
      return NextResponse.json(
        { error: "Invalid secret key" },
        { status: 403 }
      );
    }

    // 4. ロジック分岐 (敵拠点なら制圧のみ許可)
    if (node.controlledById === team.id) {
      return NextResponse.json(
        {
          error: "This node is already secured by your team.",
        },
        { status: 400 }
      );
    }

    // --- CAPTURE (制圧) ---
    // 1. 拠点を自軍のものにする
    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: {
        controlledById: team.id,
        lastHarvestedAt: new Date(), // 制圧時はタイマーリセット
      },
    });

    // 2. 制圧ボーナス (即座にCaptureRate分のスコア加算)
    const captureBonus = node.captureRate;

    // トランザクションで整合性担保
    const [updatedTeam] = await prisma.$transaction([
      prisma.team.update({
        where: { id: team.id },
        data: { score: { increment: captureBonus } },
      }),
      prisma.teamResource.upsert({
        where: {
          teamId_type: {
            teamId: team.id,
            type: node.type,
          },
        },
        update: { amount: { increment: captureBonus } },
        create: {
          teamId: team.id,
          type: node.type,
          amount: captureBonus,
        },
      }),
    ]);

    const logMessage = `【エリア制圧】${team.name}チームがエリア「${node.name}」を制圧！資源 ${captureBonus}g (${node.type}) を確保！`;
    const linkLog = await prisma.auditLog.create({
      data: {
        message: logMessage,
        teamId: team.id,
      },
    });

    // Pusher通知 (制圧 + スコア更新)
    await pusherServer.trigger("game-channel", "map-update", {
      type: "CAPTURE",
      nodeId: node.id,
      teamId: team.id,
      teamColor: team.color,
    });

    await pusherServer.trigger("game-channel", "score-update", {
      teamId: team.id,
      newScore: updatedTeam.score,
    });

    await pusherServer.trigger("game-channel", "log-new", {
      id: linkLog.id,
      message: logMessage,
      createdAt: linkLog.createdAt,
      teamColor: team.color,
    });

    return NextResponse.json({
      success: true,
      action: "CAPTURE",
      message: `エリア「${node.name}」を制圧！(ボーナス +${captureBonus}g)`,
      node: updatedNode,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

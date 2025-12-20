import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

// ロジックを共通関数として切り出し
async function executeTick() {
  // 0. ゲーム進行状態チェック
  const settings = await prisma.gameSettings.findFirst();
  if (!settings?.isGameActive) {
    return { message: "Game is not active", processed: 0 };
  }

  // 1. 支配されている全ての拠点を取得
  const nodes = await prisma.node.findMany({
    where: {
      controlledById: { not: null },
    },
  });

  if (nodes.length === 0) {
    return { message: "No controlled nodes", processed: 0 };
  }

  // 2. チームごとの加算スコアを計算
  const teamUpdates: Record<
    string,
    { total: number; resources: Record<string, number> }
  > = {};

  for (const node of nodes) {
    if (!node.controlledById) continue;
    const teamId = node.controlledById;

    if (!teamUpdates[teamId]) {
      teamUpdates[teamId] = { total: 0, resources: {} };
    }

    teamUpdates[teamId].total += node.captureRate;

    if (!teamUpdates[teamId].resources[node.type]) {
      teamUpdates[teamId].resources[node.type] = 0;
    }
    teamUpdates[teamId].resources[node.type] += node.captureRate;
  }

  // 3. データベース更新 (トランザクション)
  const updates = [];

  for (const [teamId, data] of Object.entries(teamUpdates)) {
    const resourceUpserts = Object.entries(data.resources).map(
      ([type, amount]) => {
        return prisma.teamResource.upsert({
          where: { teamId_type: { teamId, type } },
          update: { amount: { increment: amount } },
          create: { teamId, type, amount },
        });
      }
    );

    updates.push(
      prisma
        .$transaction([
          prisma.team.update({
            where: { id: teamId },
            data: { score: { increment: data.total } },
          }),
          ...resourceUpserts,
        ])
        .then(([updatedTeam]) => ({
          teamId,
          newScore: updatedTeam.score,
          added: data.total,
        }))
    );
  }

  const results = await Promise.all(updates);

  // 4. クライアントへ一斉通知
  for (const result of results) {
    await pusherServer.trigger("game-channel", "score-update", {
      teamId: result.teamId,
      newScore: result.newScore,
    });
  }

  return { success: true, processedTeams: results.length, details: results };
}

// GETでもPOSTでも同じ処理を実行する
export async function GET() {
  try {
    const result = await executeTick();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await executeTick();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

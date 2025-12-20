import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "RESET") {
      // 全データリセット
      // 1. AuditLog全削除
      await prisma.auditLog.deleteMany();

      // 2. TeamResource全削除
      await prisma.teamResource.deleteMany();

      // 3. Teamスコアリセット
      await prisma.team.updateMany({
        data: { score: 0 },
      });

      // 4. Node所有権リセット
      await prisma.node.updateMany({
        data: {
          controlledById: null,
          lastHarvestedAt: new Date(),
        },
      });

      // 5. GameSettingsリセット
      await prisma.gameSettings.deleteMany(); // 一旦全削除して初期状態へ
      await prisma.gameSettings.create({ data: { isGameActive: false } });

      // 6. ログ作成
      const log = await prisma.auditLog.create({
        data: { message: "【システム】ゲームがリセットされました。" },
      });

      // Pusher通知 (リロード要請)
      await pusherServer.trigger("game-channel", "game-reset", {
        message: "Game has been reset by admin.",
      });

      return NextResponse.json({
        success: true,
        message: "Game Reset Complete",
      });
    } else if (action === "START") {
      // ゲーム開始
      // シングルトンとしてGameSettingsを更新/作成
      const settings = await prisma.gameSettings.findFirst();
      if (settings) {
        await prisma.gameSettings.update({
          where: { id: settings.id },
          data: { isGameActive: true },
        });
      } else {
        await prisma.gameSettings.create({
          data: { isGameActive: true },
        });
      }

      const log = await prisma.auditLog.create({
        data: { message: "【システム】ゲーム開始！作戦を開始せよ！" },
      });

      await pusherServer.trigger("game-channel", "log-new", {
        id: log.id,
        message: log.message,
        createdAt: log.createdAt,
        teamColor: "#fff", // System color
      });

      return NextResponse.json({ success: true, message: "Game Started" });
    } else if (action === "FINISH") {
      // ゲーム終了
      const settings = await prisma.gameSettings.findFirst();
      if (settings) {
        await prisma.gameSettings.update({
          where: { id: settings.id },
          data: { isGameActive: false },
        });
      } else {
        await prisma.gameSettings.create({
          data: { isGameActive: false },
        });
      }

      const log = await prisma.auditLog.create({
        data: { message: "【システム】ゲーム終了！お疲れ様でした。" },
      });

      await pusherServer.trigger("game-channel", "log-new", {
        id: log.id,
        message: log.message,
        createdAt: log.createdAt,
        teamColor: "#fff", // System color
      });

      return NextResponse.json({ success: true, message: "Game Finished" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

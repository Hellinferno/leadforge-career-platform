import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/auth";
import { getDb } from "@/db";
import { oauthConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const connections = await db
    .select({
      id: oauthConnections.id,
      provider: oauthConnections.provider,
      accountEmail: oauthConnections.accountEmail,
      accountName: oauthConnections.accountName,
      syncedCount: oauthConnections.syncedCount,
      lastSyncedAt: oauthConnections.lastSyncedAt,
      createdAt: oauthConnections.createdAt,
    })
    .from(oauthConnections)
    .where(eq(oauthConnections.ownerId, user.userId));

  return NextResponse.json({ connections });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing connection ID" }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(oauthConnections)
    .where(
      and(
        eq(oauthConnections.id, id),
        eq(oauthConnections.ownerId, user.userId)
      )
    );

  return NextResponse.json({ success: true });
}

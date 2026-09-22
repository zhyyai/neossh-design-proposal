import { NextResponse } from "next/server";
import { count, desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { commandLogs, hosts, sessions, snippets, tunnels } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import { ptyManager } from "@/lib/pty-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();

  const [hostCount] = await db.select({ value: count() }).from(hosts);
  const [sessionCount] = await db.select({ value: count() }).from(sessions);
  const [commandCount] = await db.select({ value: count() }).from(commandLogs);
  const [snippetCount] = await db.select({ value: count() }).from(snippets);
  const [tunnelCount] = await db
    .select({ value: count() })
    .from(tunnels);

  const riskRows = await db
    .select({ risk: commandLogs.risk, value: count() })
    .from(commandLogs)
    .groupBy(commandLogs.risk);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const perDay = await db
    .select({
      day: sql<string>`date_trunc('day', ${commandLogs.executedAt})::date::text`,
      value: count(),
    })
    .from(commandLogs)
    .where(gte(commandLogs.executedAt, sevenDaysAgo))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const recentSessions = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(6);

  const dangerCount = Number(
    riskRows.find((r) => r.risk === "danger")?.value ?? 0,
  );

  return NextResponse.json({
    hosts: Number(hostCount.value),
    sessionsTotal: Number(sessionCount.value),
    commandsTotal: Number(commandCount.value),
    snippets: Number(snippetCount.value),
    tunnels: Number(tunnelCount.value),
    dangerCount,
    liveSessions: ptyManager.activeCount(),
    commandsPerDay: perDay.map((r) => ({ day: r.day, value: Number(r.value) })),
    recentSessions,
  });
}

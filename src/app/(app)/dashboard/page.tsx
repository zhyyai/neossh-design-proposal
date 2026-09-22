import { asc, count, desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { commandLogs, hosts, sessions } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureSeed();

  const [hostCount] = await db.select({ value: count() }).from(hosts);
  const [sessionCount] = await db.select({ value: count() }).from(sessions);
  const [commandCount] = await db.select({ value: count() }).from(commandLogs);

  const [dangerCount] = await db
    .select({ value: count() })
    .from(commandLogs)
    .where(sql`${commandLogs.risk} = 'danger'`);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000);
  const perDayRows = await db
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
    .limit(7);

  const hostRows = await db
    .select()
    .from(hosts)
    .orderBy(asc(hosts.groupName), asc(hosts.name));

  // normalize onto a continuous 7-day axis
  const dayMap = new Map(perDayRows.map((r) => [r.day.slice(0, 10), Number(r.value)]));
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { day: key.slice(5), value: dayMap.get(key) ?? 0 };
  });

  return (
    <DashboardClient
      stats={{
        hosts: Number(hostCount.value),
        sessions: Number(sessionCount.value),
        commands: Number(commandCount.value),
        danger: Number(dangerCount.value),
      }}
      perDay={perDay}
      recentSessions={recentSessions.map((s) => ({
        id: s.id,
        hostLabel: s.hostLabel,
        target: s.target,
        mode: s.mode,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
      }))}
      hosts={hostRows.map((h) => ({
        id: h.id,
        name: h.name,
        hostname: h.hostname,
        groupName: h.groupName,
        color: h.color,
      }))}
    />
  );
}

import { desc } from "drizzle-orm";
import { db } from "@/db";
import { commandLogs, sessions } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import AuditClient from "@/components/audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await ensureSeed();

  const sessionRows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(80);

  const commandRows = await db
    .select()
    .from(commandLogs)
    .orderBy(desc(commandLogs.executedAt))
    .limit(120);

  return (
    <AuditClient
      sessions={sessionRows.map((s) => ({
        id: s.id,
        hostLabel: s.hostLabel,
        target: s.target,
        mode: s.mode,
        status: s.status,
        exitCode: s.exitCode,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
      }))}
      commands={commandRows.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        hostLabel: c.hostLabel,
        command: c.command,
        risk: c.risk,
        executedAt: c.executedAt.toISOString(),
      }))}
    />
  );
}

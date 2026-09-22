import { desc } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";
import ReplayClient from "@/components/replay-client";

export const dynamic = "force-dynamic";

export default async function ReplaysPage() {
  let rows: Array<{
    id: string;
    sessionLabel: string;
    target: string;
    mode: string;
    bytes: number;
    durationMs: number;
    createdAt: string;
  }> = [];
  try {
    const r = await db
      .select({
        id: recordings.id,
        sessionLabel: recordings.sessionLabel,
        target: recordings.target,
        mode: recordings.mode,
        bytes: recordings.bytes,
        durationMs: recordings.durationMs,
        createdAt: recordings.createdAt,
      })
      .from(recordings)
      .orderBy(desc(recordings.createdAt))
      .limit(80);
    rows = r.map((x) => ({ ...x, createdAt: x.createdAt.toISOString() }));
  } catch {
    // recordings table may not exist yet on first boot
  }
  return <ReplayClient initialRecordings={rows} />;
}

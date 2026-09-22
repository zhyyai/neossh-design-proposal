import { desc } from "drizzle-orm";
import { db } from "@/db";
import { tunnels } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import TunnelsClient from "@/components/tunnels-client";

export const dynamic = "force-dynamic";

export default async function TunnelsPage() {
  await ensureSeed();
  const rows = await db
    .select()
    .from(tunnels)
    .orderBy(desc(tunnels.createdAt));

  return (
    <TunnelsClient
      initialTunnels={rows.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      }))}
    />
  );
}

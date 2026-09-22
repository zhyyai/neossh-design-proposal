import { asc } from "drizzle-orm";
import { db } from "@/db";
import { hosts } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import HostsClient from "@/components/hosts-client";

export const dynamic = "force-dynamic";

export default async function HostsPage() {
  await ensureSeed();
  const rows = await db
    .select()
    .from(hosts)
    .orderBy(asc(hosts.groupName), asc(hosts.name));

  return (
    <HostsClient
      initialHosts={rows.map((h) => ({
        ...h,
        tags: h.tags ?? [],
        lastConnectedAt: h.lastConnectedAt?.toISOString() ?? null,
        createdAt: h.createdAt.toISOString(),
      }))}
    />
  );
}

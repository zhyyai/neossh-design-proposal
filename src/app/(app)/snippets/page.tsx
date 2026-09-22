import { desc } from "drizzle-orm";
import { db } from "@/db";
import { snippets } from "@/db/schema";
import { ensureSeed } from "@/db/seed";
import SnippetsClient from "@/components/snippets-client";

export const dynamic = "force-dynamic";

export default async function SnippetsPage() {
  await ensureSeed();
  const rows = await db
    .select()
    .from(snippets)
    .orderBy(desc(snippets.usageCount));

  return (
    <SnippetsClient
      initialSnippets={rows.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}

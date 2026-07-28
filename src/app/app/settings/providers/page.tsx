import { query } from "@/lib/db";
import { getOrCreateLocalUserId } from "@/lib/local-user";
import { ConnectionForm } from "@/components/app/connection-form";
import { ConnectionList } from "@/components/app/connection-list";

// Reads live local data on every request -- must never be statically
// cached at build time (this ran the DB query during `next build` and
// baked in a stale snapshot before this was added).
export const dynamic = "force-dynamic";

interface ConnectionRow {
  id: string;
  provider: string;
  label: string;
  storage_mode: string;
  status: string;
  masked_ending: string | null;
  created_at: string;
}

export default async function ProviderConnectionsPage() {
  const userId = await getOrCreateLocalUserId();
  const connections = await query<ConnectionRow>(
    `select id, provider, label, storage_mode, status, masked_ending, last_validated_at, created_at
     from provider_connections
     where user_id = $1
     order by created_at desc`,
    [userId]
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Provider connections</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bring your own Google Gemini or OpenAI key, or connect the Mock Provider to try
        every AI-assisted tool without any external calls. Your key is used only for
        your own requests and is never logged.
      </p>

      <div className="mt-8">
        <ConnectionForm />
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-muted-foreground">Connected</h2>
        <div className="mt-3">
          <ConnectionList initialConnections={connections} />
        </div>
      </div>
    </div>
  );
}

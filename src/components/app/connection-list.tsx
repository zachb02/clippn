"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Connection {
  id: string;
  provider: string;
  label: string;
  storage_mode: string;
  status: string;
  masked_ending: string | null;
  created_at: string;
}

export function ConnectionList({ initialConnections }: { initialConnections: Connection[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDisconnect(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/providers/connections/${id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error("Could not disconnect this provider.");
        return;
      }
      toast.success("Disconnected.");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (initialConnections.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        No providers connected yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {initialConnections.map((connection) => (
        <li
          key={connection.id}
          className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{connection.label}</span>
              <Badge variant="outline">{connection.provider}</Badge>
              <Badge variant={connection.status === "connected" ? "default" : "destructive"}>
                {connection.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {connection.storage_mode === "session" ? "Session only" : "Remembered (encrypted)"}
              {connection.masked_ending ? ` · ends in ${connection.masked_ending}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDisconnect(connection.id)}
            disabled={deletingId === connection.id}
            title="Disconnect"
          >
            <Trash className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

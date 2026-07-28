"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, DotsThree, FolderOpen } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { ProjectRow } from "@/app/api/projects/route";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  completed: "default",
  archived: "outline",
  failed: "destructive",
};

export function ProjectDashboard({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), workflow: "manual" }),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body.error ?? "Could not create the project.");
        return;
      }
      toast.success("Project created.");
      setTitle("");
      setDialogOpen(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    const response = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    if (!response.ok) {
      toast.error("Could not rename the project.");
      return;
    }
    toast.success("Renamed.");
    setRenamingId(null);
    router.refresh();
  }

  async function handleArchive(id: string) {
    const response = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (!response.ok) {
      toast.error("Could not archive the project.");
      return;
    }
    toast.success("Archived.");
    router.refresh();
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete the project.");
      return;
    }
    toast.success("Deleted.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus />New project</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <DialogFooter>
              <Button onClick={handleCreate} disabled={creating || !title.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {initialProjects.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 p-12 text-center">
          <FolderOpen className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No projects yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialProjects.map((project) => (
            <div key={project.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                {renamingId === project.id ? (
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(project.id)}
                    onBlur={() => handleRename(project.id)}
                    autoFocus
                    className="h-7"
                  />
                ) : (
                  <p className="font-medium">{project.title}</p>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <DotsThree className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenamingId(project.id);
                        setRenameValue(project.title);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(project.id)}>Archive</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(project.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[project.status] ?? "secondary"}>{project.status}</Badge>
                <Badge variant="outline">{project.workflow}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

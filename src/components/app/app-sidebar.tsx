"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  FolderOpen,
  Plus,
  Scissors,
  ImageSquare,
  Sparkle,
  Waveform,
  Gear,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

// No disabled/"soon" entries here on purpose -- Templates and Social
// Tracker aren't buildable honestly right now (Templates would need a
// real 14-category content build, Social Tracker needs OAuth app
// registrations on each platform this environment doesn't have), and a
// dedicated "Editor" entry would just duplicate Projects, which already
// opens a real per-project editor. Add an item here only once it's real.
const NAV_ITEMS: { href: string; label: string; icon: typeof House; built: boolean }[] = [
  { href: "/app", label: "Home", icon: House, built: true },
  { href: "/app/projects", label: "Projects", icon: FolderOpen, built: true },
  { href: "/app/create", label: "Create", icon: Plus, built: true },
  { href: "/app/auto-clip", label: "Auto Clip", icon: Scissors, built: true },
  { href: "/app/assets", label: "Assets", icon: ImageSquare, built: true },
  { href: "/app/ai-tools", label: "AI Tools", icon: Sparkle, built: true },
  { href: "/app/audio-tools", label: "Audio Tools", icon: Waveform, built: true },
  { href: "/app/settings/providers", label: "Settings", icon: Gear, built: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          C
        </span>
        <span className="font-heading text-lg font-bold tracking-tight">Clippn</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          if (!item.built) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Not built yet"
                className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/50"
              >
                <item.icon className="size-4.5 shrink-0" />
                {item.label}
                <span className="ml-auto rounded-full border border-border/40 px-1.5 py-0.5 text-[10px]">
                  soon
                </span>
              </span>
            );
          }
          const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

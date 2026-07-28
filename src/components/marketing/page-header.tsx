import type { ReactNode } from "react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto px-6 pt-16 pb-4 md:pt-24",
        align === "center" ? "max-w-3xl text-center" : "max-w-3xl",
        className
      )}
    >
      <Reveal>
        <span className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          {eyebrow}
        </span>
        <h1 className="mt-6 text-4xl leading-[1.05] font-bold tracking-tighter md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </Reveal>
    </div>
  );
}

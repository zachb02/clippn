import type { ReactNode } from "react";

export function LegalContent({ children }: { children: ReactNode }) {
  return (
    <div
      className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:first:mt-0 [&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_td]:border-b [&_td]:border-border/60 [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top [&_th]:border-b [&_th]:border-border/60 [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
    >
      {children}
    </div>
  );
}

export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-4 pb-24">
      <LegalContent>{children}</LegalContent>
    </div>
  );
}

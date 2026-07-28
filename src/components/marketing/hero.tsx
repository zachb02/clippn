import Link from "next/link";
import { ArrowRight, Waveform } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-16 px-6 pt-16 pb-24 md:grid-cols-2 md:items-center md:pt-24 md:pb-32">
      <div>
        <span className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          No paywall. No credits. No watermark.
        </span>
        <h1 className="mt-6 text-4xl leading-[1.05] font-bold tracking-tighter md:text-6xl">
          Cut, caption, and ship
          <br />
          short-form video —
          <br />
          <span className="text-primary">without the upsell.</span>
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
          Clippn turns long recordings into ready-to-post clips using fully local
          processing, or your own Google Gemini / OpenAI key when you want AI help.
          Every feature and every export is available from the first minute —
          no trial, no locked tier.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link href="/app">
                Start creating free
                <ArrowRight />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link href="/tools">Explore the tools</Link>}
          />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        <div className="absolute -inset-x-8 -inset-y-8 -z-10 rounded-[2rem] bg-primary/10 blur-3xl" />
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl">
          <div className="relative aspect-[9/16] w-full bg-gradient-to-b from-secondary to-background">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-white">REC 00:42</span>
            </div>
            <div className="absolute right-4 bottom-16 left-4 rounded-lg bg-black/50 px-3 py-2 text-center text-sm font-semibold text-white backdrop-blur-sm">
              your caption appears here
            </div>
          </div>
          <div className="space-y-2 border-t border-border/60 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Waveform className="size-4" />
              <div className="flex h-4 flex-1 items-end gap-[2px]">
                {[6, 12, 8, 16, 10, 14, 7, 11, 9, 15, 6, 13, 8, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-full flex-1 rounded-sm bg-primary/50"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

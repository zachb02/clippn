import Link from "next/link";
import {
  Lightbulb,
  Image,
  Palette,
  UserSquare,
  MicrophoneStage,
  Faders,
  MusicNotes,
  Cube,
  VideoCamera,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { icon: Lightbulb, label: "Content Brainstorm" },
  { icon: Image, label: "AI Image Generator" },
  { icon: Palette, label: "AI Image Editor" },
  { icon: UserSquare, label: "Icon / Avatar Generator" },
  { icon: MicrophoneStage, label: "AI Voiceover" },
  { icon: Faders, label: "Voice Changer" },
  { icon: MusicNotes, label: "Vocal / Instrumental Separator" },
  { icon: Cube, label: "Background Remover" },
  { icon: VideoCamera, label: "AI Video Tool" },
];

export function ToolTeaser() {
  return (
    <section className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                A full toolkit, not a locked one
              </h2>
              <p className="mt-3 text-muted-foreground">
                Twelve AI-assisted tools, each running on the key you bring — or the
                built-in Mock Provider if you&apos;d rather try things risk-free first.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-fit"
              nativeButton={false}
              render={
                <Link href="/tools">
                  View all tools
                  <ArrowRight />
                </Link>
              }
            />
          </div>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOOLS.map((tool, i) => (
            <Reveal key={tool.label} delay={(i % 5) * 0.05}>
              <div className="flex h-full flex-col items-start gap-3 rounded-xl border border-border/60 bg-background p-4">
                <tool.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{tool.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

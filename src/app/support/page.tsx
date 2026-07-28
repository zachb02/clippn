import type { Metadata } from "next";
import Link from "next/link";
import {
  UserCircle,
  Bug,
  Lightbulb,
  ShieldWarning,
  Question,
  Envelope,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Support — Clippn",
  description:
    "Get help with your account, report a bug, request a feature, or flag a content or safety issue.",
};

const SUPPORT_EMAIL = "support@clippn.app";

const CATEGORIES = [
  {
    icon: UserCircle,
    title: "Account",
    body: "Sign-in trouble, connecting or disconnecting a provider, project access, or anything else about your account.",
    subject: "Account support",
  },
  {
    icon: Bug,
    title: "Bug report",
    body: "Something broke, rendered incorrectly, or didn't behave the way this site says it should.",
    subject: "Bug report",
  },
  {
    icon: Lightbulb,
    title: "Feature request",
    body: "A workflow, tool, or editing capability you'd like to see added.",
    subject: "Feature request",
  },
  {
    icon: ShieldWarning,
    title: "Content / safety report",
    body: "Flag content or behavior that may violate the acceptable use policy, including non-consensual media or deceptive likeness use.",
    subject: "Content or safety report",
  },
  {
    icon: Question,
    title: "Other",
    body: "Anything that doesn't fit the categories above.",
    subject: "Support request",
  },
];

export default function SupportPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          eyebrow="Support"
          title="Tell us what's going on."
          subtitle="Pick the category closest to your issue and it opens an email to our support address with the subject pre-filled. There's no ticket dashboard yet and no field anywhere asks you to paste an API key — never send us your provider key over email either."
        />

        <section className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((cat, i) => (
              <Reveal key={cat.title} delay={(i % 2) * 0.06}>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                    `[${cat.subject}] `
                  )}`}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/40"
                >
                  <cat.icon className="size-5 text-primary" />
                  <h3 className="text-base font-semibold">{cat.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {cat.body}
                  </p>
                </a>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Envelope className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Prefer to write directly?</p>
                  <p className="text-sm text-muted-foreground">
                    Email{" "}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline underline-offset-4">
                      {SUPPORT_EMAIL}
                    </a>{" "}
                    any time.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.26}>
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
              Copyright, likeness-removal, and account-deletion requests have their own
              dedicated forms so they&apos;re routed correctly: see{" "}
              <Link href="/copyright" className="text-primary underline underline-offset-4">
                Copyright requests
              </Link>
              ,{" "}
              <Link
                href="/likeness-removal"
                className="text-primary underline underline-offset-4"
              >
                likeness removal
              </Link>
              , and{" "}
              <Link
                href="/data-deletion"
                className="text-primary underline underline-offset-4"
              >
                data deletion
              </Link>
              .
            </p>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

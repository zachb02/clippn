import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { LegalContent } from "@/components/marketing/legal-content";
import { Reveal } from "@/components/marketing/reveal";
import { LikenessRemovalForm } from "./likeness-removal-form";

export const metadata: Metadata = {
  title: "Likeness Removal — Clippn",
  description:
    "Request removal of content that uses your face, voice, or likeness without your permission.",
};

export default function LikenessRemovalPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          align="left"
          eyebrow="Likeness removal"
          title="Request removal of your likeness."
          subtitle="If your face, voice, or another identifying trait appears in content processed through Clippn without your permission, use this form to request its removal."
        />

        <section className="mx-auto max-w-3xl px-6 pt-4 pb-8">
          <Reveal>
            <LegalContent>
              <section>
                <h2>How this works</h2>
                <p>
                  Face-swap and other likeness-editing tools already require the person
                  submitting the job to confirm they own the media or have explicit
                  permission from everyone identifiable in it. If that didn&apos;t
                  happen, or you&apos;ve withdrawn permission you previously gave,
                  submit the form below with enough detail to identify the content. We
                  review requests, may disable the identified content pending review,
                  and will follow up at the email you provide.
                </p>
                <p>
                  This is different from a{" "}
                  <Link href="/copyright">copyright request</Link>, which is about
                  ownership of a creative work rather than a person&apos;s likeness.
                </p>
              </section>
            </LegalContent>
          </Reveal>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <Reveal delay={0.06}>
            <LikenessRemovalForm />
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

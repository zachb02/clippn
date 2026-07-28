import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { LegalContent } from "@/components/marketing/legal-content";
import { Reveal } from "@/components/marketing/reveal";
import { CopyrightRequestForm } from "./copyright-request-form";

export const metadata: Metadata = {
  title: "Copyright Requests — Clippn",
  description:
    "Report content on Clippn that infringes your copyright and request its removal.",
};

export default function CopyrightPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          align="left"
          eyebrow="Copyright"
          title="Report a copyright concern."
          subtitle="If content hosted through Clippn uses your copyrighted work without authorization, use this form to request its removal."
        />

        <section className="mx-auto max-w-3xl px-6 pt-4 pb-8">
          <Reveal>
            <LegalContent>
              <section>
                <h2>How this works</h2>
                <p>
                  Submit the form below with enough detail to identify the work and
                  where it appears. We review requests, may disable the identified
                  content pending review, and will follow up at the email you provide.
                  Submitting a request that misrepresents ownership or is not made in
                  good faith may have legal consequences for the person who submits it.
                </p>
                <p>
                  This is separate from a <Link href="/likeness-removal">likeness
                  removal</Link> request, which applies when someone&apos;s face or
                  voice appears in content without their permission rather than a
                  copyright claim over a creative work.
                </p>
              </section>
            </LegalContent>
          </Reveal>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <Reveal delay={0.06}>
            <CopyrightRequestForm />
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

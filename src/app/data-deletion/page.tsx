import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { LegalContent } from "@/components/marketing/legal-content";
import { Reveal } from "@/components/marketing/reveal";
import { DataDeletionForm } from "./data-deletion-form";

export const metadata: Metadata = {
  title: "Data Deletion — Clippn",
  description:
    "Request permanent deletion of your Clippn account and data, and see exactly what gets removed and when.",
};

export default function DataDeletionPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          align="left"
          eyebrow="Data deletion"
          title="Delete your account and data."
          subtitle="Deleting your account is not a soft-delete purgatory — it's a real deletion, on a schedule you can see up front."
        />

        <section className="mx-auto max-w-3xl px-6 pt-4 pb-8">
          <Reveal>
            <LegalContent>
              <section>
                <h2>What gets deleted</h2>
                <ul>
                  <li>
                    Your account record, profile fields, and authentication identity.
                  </li>
                  <li>
                    All projects, timelines, transcripts, templates, and versions
                    associated with your account.
                  </li>
                  <li>
                    All media in your private storage, including source uploads,
                    proxies, thumbnails, waveforms, and render outputs.
                  </li>
                  <li>
                    Any persisted (&quot;remembered&quot;) AI provider connections and
                    their encrypted credentials.
                  </li>
                </ul>
              </section>
              <section>
                <h2>Retention and grace period</h2>
                <p>
                  After you submit a deletion request, your account is disabled
                  immediately and enters a 30-day grace period. During that window you
                  can contact <a href="mailto:privacy@clippn.app">privacy@clippn.app</a>{" "}
                  to cancel the request and restore access. After the grace period
                  ends, your account and all associated data listed above are
                  permanently purged from primary storage, and from backups on their
                  normal rotation schedule.
                </p>
                <p>
                  This does not affect requests that already went to a third-party AI
                  provider using your own connected key — that provider&apos;s own
                  retention policy governs anything they retain on their side.
                </p>
              </section>
            </LegalContent>
          </Reveal>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <Reveal delay={0.06}>
            <DataDeletionForm />
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

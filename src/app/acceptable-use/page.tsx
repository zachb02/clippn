import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { LegalPage } from "@/components/marketing/legal-content";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — Clippn",
  description:
    "Clippn's prohibited-use policy: what you may not create, upload, or process, and how likeness and disclosure requirements work.",
};

const LAST_UPDATED = "July 21, 2026";

export default function AcceptableUsePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          align="left"
          eyebrow={`Last updated ${LAST_UPDATED}`}
          title="Acceptable Use Policy"
          subtitle="Clippn is a creative tool, not a moderation bypass. This policy sets the line on what you may not create, upload, or process with it."
        />
        <LegalPage>
          <section>
            <h2>1. Prohibited uses</h2>
            <p>You may not use Clippn to create, upload, process, or distribute:</p>
            <ul>
              <li>Sexual content involving minors, in any form</li>
              <li>Any sexualization of minors</li>
              <li>Non-consensual intimate media</li>
              <li>Deceptive face swaps</li>
              <li>Deceptive voice impersonation</li>
              <li>Fabricated evidence</li>
              <li>Fraud and scams</li>
              <li>Harassment, defamation, or doxxing</li>
              <li>Copyright infringement</li>
              <li>Trademark impersonation</li>
              <li>Illegal content</li>
              <li>Attempts to bypass application or provider safeguards</li>
            </ul>
            <p>
              This list isn&apos;t exhaustive. If something isn&apos;t named here but
              is clearly designed to deceive, exploit, or harm a real person, treat it
              as prohibited.
            </p>
          </section>

          <section>
            <h2>2. Likeness processing</h2>
            <p>
              Face-swap and other likeness-editing workflows require you to
              affirmatively check a consent attestation before the job runs:
            </p>
            <p>
              <em>
                &quot;I confirm that I own this media or have explicit permission from
                every identifiable person whose likeness will be processed.&quot;
              </em>
            </p>
            <p>
              We record who submitted the job, which project and source assets were
              used, when, which provider or processor ran it, and which version of the
              consent statement was in effect — so a claim of consent is something we
              can actually check, not just a checkbox that disappears.
            </p>
            <p>
              If you appear in likeness-edited media without your permission, you can
              request its removal at any time — see{" "}
              <Link href="/likeness-removal">Likeness removal</Link>.
            </p>
          </section>

          <section>
            <h2>3. Fictional chat disclosures</h2>
            <p>
              Fictional chat videos are expected to carry a visible disclosure, enabled
              by default, so a viewer can tell the conversation shown is dramatized
              rather than a real exchange. That disclosure is preserved as metadata in
              the exported file.
            </p>
          </section>

          <section>
            <h2>4. Reused text and story content</h2>
            <p>
              Story-video workflows that turn submitted text into narrated video
              require you to confirm you have permission to reuse that text. We do not
              scrape or ingest third-party story content on your behalf.
            </p>
          </section>

          <section>
            <h2>5. Enforcement and takedowns</h2>
            <p>
              We provide dedicated{" "}
              <Link href="/copyright">copyright</Link>,{" "}
              <Link href="/likeness-removal">likeness-removal</Link>, and{" "}
              <Link href="/data-deletion">data-deletion</Link> workflows so that
              disputed content can be disabled quickly. Administrators reviewing a
              report can disable an asset while preserving the underlying evidence
              securely for that review — they cannot use that access to view private
              media without a documented reason tied to the report.
            </p>
            <p>
              Violating this policy may result in content removal, feature
              restriction, or account termination, independent of and in addition to
              any legal action available to an affected person or rights holder.
            </p>
          </section>

          <section>
            <h2>6. Reporting a violation</h2>
            <p>
              If you see content that violates this policy, report it from{" "}
              <Link href="/support">Support</Link> under &quot;Content / safety
              report,&quot; or use the dedicated{" "}
              <Link href="/copyright">copyright</Link> or{" "}
              <Link href="/likeness-removal">likeness-removal</Link> forms if either
              applies.
            </p>
          </section>
        </LegalPage>
      </main>
      <SiteFooter />
    </div>
  );
}

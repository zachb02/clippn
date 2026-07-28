import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { LegalPage } from "@/components/marketing/legal-content";

export const metadata: Metadata = {
  title: "Terms of Use — Clippn",
  description:
    "The terms governing your use of Clippn: acceptable use, content ownership, warranty, liability, and account termination.",
};

const LAST_UPDATED = "July 21, 2026";

export default function TermsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          align="left"
          eyebrow={`Last updated ${LAST_UPDATED}`}
          title="Terms of Use"
          subtitle="These terms govern your use of Clippn. By running or using this software, you agree to them."
        />
        <LegalPage>
          <section>
            <h2>1. The service</h2>
            <p>
              Clippn is a short-form video creation and editing tool. It provides a
              multitrack editor, automatic clipping and captioning workflows, local
              media-processing tools, and optional AI-assisted tools that use a
              provider credential you supply yourself. There is no paid tier: every
              feature described on this site is available to every account, subject
              only to reasonable technical limits applied for abuse prevention and
              infrastructure stability.
            </p>
          </section>

          <section>
            <h2>2. Self-hosted use and eligibility</h2>
            <p>
              Clippn has no hosted accounts or login — you run it on your own machine
              against your own local database, and you are responsible for that
              environment: keeping your dependencies patched, your local data backed up
              if you care to, and your own copy of any provider API keys you connect
              secure. You must be old enough, under the law of the place you live, to
              agree to these terms on your own behalf.
            </p>
          </section>

          <section>
            <h2>3. Acceptable use</h2>
            <p>
              Your use of Clippn is also governed by the{" "}
              <Link href="/acceptable-use">Acceptable Use Policy</Link>, which lists
              prohibited content and behavior in detail — including sexual content
              involving minors, non-consensual intimate media, deceptive impersonation,
              fabricated evidence, fraud, harassment, and infringement. Violating that
              policy is a violation of these terms and may result in content removal
              or account termination.
            </p>
          </section>

          <section>
            <h2>4. Your content</h2>
            <p>
              You own the media you upload and the content you create using Clippn.
              Uploading or creating content does not transfer any ownership to us. To
              operate the service, you grant us a limited license to store, process,
              transmit, and display your content back to you and to anyone you
              explicitly share it with — solely for the purpose of providing the
              service you requested. We don&apos;t use your content to train models we
              operate, and we don&apos;t license your content to third parties.
            </p>
            <p>
              You&apos;re responsible for having the rights necessary to upload,
              process, and export any content you submit, including any story text,
              likeness, voice, music, or footage that isn&apos;t originally yours.
            </p>
          </section>

          <section>
            <h2>5. Third-party AI providers</h2>
            <p>
              AI-assisted tools operate using a credential you connect for a
              third-party provider (for example, Google Gemini or OpenAI), or the
              built-in Mock Provider, which performs no external calls. When you
              connect a real provider, your use of that provider is governed by that
              provider&apos;s own terms, and any cost, quota, or content policy they
              apply is between you and them — not us. We are not
              responsible for a third-party provider&apos;s output, availability, or
              billing.
            </p>
          </section>

          <section>
            <h2>6. No warranty</h2>
            <p>
              Clippn is provided &quot;as is&quot; and &quot;as available,&quot;
              without warranties of any kind, express or implied, including
              warranties of merchantability, fitness for a particular purpose, and
              non-infringement. We don&apos;t warrant that the service will be
              uninterrupted, error-free, or that every render will meet your
              expectations of quality.
            </p>
          </section>

          <section>
            <h2>7. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Clippn and its operators are not
              liable for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of data, revenue, or goodwill, arising from your use
              of the service — even if we were advised of the possibility of such
              damages. Where liability cannot be excluded, it is limited to the amount
              you paid us for the service in the twelve months before the claim, which,
              given there is no paid tier, is expected to be zero.
            </p>
          </section>

          <section>
            <h2>8. Indemnification</h2>
            <p>
              You agree to defend and indemnify us against claims arising from content
              you upload or create, your violation of these terms or the Acceptable Use
              Policy, or your violation of any law or third party&apos;s rights.
            </p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>
              You may stop using Clippn and delete your account at any time — see{" "}
              <Link href="/data-deletion">Data deletion</Link>. We may suspend or
              terminate an account that violates these terms, the Acceptable Use
              Policy, or applicable law, or that poses a security risk to the service
              or other users. Where practical, we&apos;ll tell you why. Sections that
              by their nature should survive termination — including ownership,
              warranty disclaimers, liability limits, and indemnification — continue
              to apply after your account is closed.
            </p>
          </section>

          <section>
            <h2>10. Changes to these terms</h2>
            <p>
              If we make a material change, we&apos;ll update the date at the top of
              this page. Continuing to use Clippn after a change takes effect means you
              accept the revised terms.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              Questions about these terms can go to{" "}
              <a href="mailto:legal@clippn.app">legal@clippn.app</a>, or through{" "}
              <Link href="/support">Support</Link>.
            </p>
          </section>
        </LegalPage>
      </main>
      <SiteFooter />
    </div>
  );
}

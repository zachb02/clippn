import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PageHeader } from "@/components/marketing/page-header";
import { LegalPage } from "@/components/marketing/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Clippn",
  description:
    "What Clippn collects, how long different kinds of data are kept, and how to control or delete yours.",
};

const LAST_UPDATED = "July 21, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHeader
          align="left"
          eyebrow={`Last updated ${LAST_UPDATED}`}
          title="Privacy Policy"
          subtitle="This page explains what Clippn collects, why, how long each kind of data is kept, and how to get yours deleted. It's written the way we'd want it explained to us — no filler, no legal padding for its own sake."
        />
        <LegalPage>
          <section>
            <h2>1. What this covers</h2>
            <p>
              This policy applies to clippn.app and any self-hosted deployment running
              this codebase against its own infrastructure. It covers the marketing
              site, the account and editor application, the local media tools, and any
              AI-assisted tool you choose to connect a provider to.
            </p>
          </section>

          <section>
            <h2>2. What we collect</h2>
            <ul>
              <li>
                <strong>Account information:</strong> your email address, a hashed
                password or OAuth identity if you sign up, and basic profile fields you
                choose to add.
              </li>
              <li>
                <strong>Project content:</strong> media you upload, projects you
                create, timelines, transcripts, generated assets, templates, and render
                outputs.
              </li>
              <li>
                <strong>Provider connection metadata:</strong> which AI provider you&apos;ve
                connected, its connection status, and capability information — never
                the credential value itself in plain form (see Section 4).
              </li>
              <li>
                <strong>Usage and diagnostic data:</strong> job status, error rates,
                and basic request metadata used to keep the service running. Provider
                API keys, authorization headers, and secret-shaped values are
                automatically redacted before anything is logged.
              </li>
              <li>
                <strong>Anonymous tool usage:</strong> if you use a local tool like the
                video cutter or cropper without an account, we process the file you
                upload for that job and do not tie it to an identity.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. How we use it</h2>
            <p>
              We use your information to operate the editor, run the workflow and tool
              you asked for, save your projects, and keep the service secure and
              functioning. We do not use your project content or uploaded media to
              train any model we operate, and we do not sell your information.
            </p>
          </section>

          <section>
            <h2>4. Provider API keys</h2>
            <p>
              Clippn is bring-your-own-key: when a tool needs an AI provider, you
              supply your own Google Gemini or OpenAI credential (or use the built-in
              Mock Provider, which needs no credential at all). Your key is never
              readable in browser storage, cookies, page source, URLs, logs, error
              messages, or support tooling. It is used only to make the specific
              request you triggered, sent directly to the provider you chose.
            </p>
            <p>
              You choose how it&apos;s held: a <strong>session-only</strong> connection
              keeps the key in server memory for your active session and discards it
              on logout or expiry, never touching disk. A{" "}
              <strong>remembered</strong> connection encrypts the key individually
              before storage, using a unique per-credential key wrapped by our
              key-management service, so it can be reused on a later visit without you
              re-entering it. See the retention table below for exact timing.
            </p>
          </section>

          <section>
            <h2>5. Data retention</h2>
            <p>
              Different kinds of data are kept for different lengths of time,
              deliberately, so that nothing lingers longer than the reason it was
              collected:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Data type</th>
                  <th>Retention</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Session-only provider credentials</td>
                  <td>
                    Held in server memory only for your active session. Discarded on
                    logout, explicit disconnect, or session expiry. Never written to
                    disk or a database.
                  </td>
                </tr>
                <tr>
                  <td>Persisted (&quot;remembered&quot;) provider credentials</td>
                  <td>
                    Stored encrypted at rest with a unique key per credential, wrapped
                    by our key-management service. Retained until you rotate,
                    disconnect, or delete the connection yourself.
                  </td>
                </tr>
                <tr>
                  <td>Anonymous temporary media (no-account tool usage)</td>
                  <td>
                    Processed in a sandboxed temporary directory tied to that one job.
                    Deleted automatically once your export finishes downloading or the
                    session ends — it is not retained afterward.
                  </td>
                </tr>
                <tr>
                  <td>Cloud-hosted project media (signed-in accounts)</td>
                  <td>
                    Retained in private, signed-URL-only storage for as long as your
                    account and the containing project remain active. Removed when you
                    delete the project, or on account deletion subject to the grace
                    period described on the{" "}
                    <Link href="/data-deletion">data deletion</Link> page.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2>6. Cookies and similar technologies</h2>
            <p>
              We use strictly necessary, HTTP-only, SameSite cookies to keep you signed
              in and to protect write requests from cross-site forgery. We do not use
              third-party advertising trackers or cross-site behavioral profiling
              cookies.
            </p>
          </section>

          <section>
            <h2>7. How information is shared</h2>
            <p>We don&apos;t sell your information. It&apos;s shared only with:</p>
            <ul>
              <li>
                Infrastructure sub-processors we use to run the service — hosting,
                database, object storage, and queue providers — bound by their own
                security and confidentiality obligations to us.
              </li>
              <li>
                The AI provider you personally connect, and only for the specific
                request you send it. That provider&apos;s own privacy and usage terms govern
                how they handle the request once it reaches them.
              </li>
              <li>
                Law enforcement or another party, only when required by valid legal
                process, and otherwise never.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. Security</h2>
            <p>
              Media is stored privately behind short-lived signed URLs. Provider
              credentials that are persisted use authenticated encryption with
              per-credential keys. Uploads are validated against their declared file
              type before processing, and every media-processing job runs in an
              isolated, resource-bounded worker with no network access beyond private
              storage. No security model is perfect — if you find a gap, tell us
              through <Link href="/support">Support</Link> under &quot;Bug
              report.&quot;
            </p>
          </section>

          <section>
            <h2>9. Your choices and rights</h2>
            <ul>
              <li>
                Request permanent deletion of your account and associated data — see{" "}
                <Link href="/data-deletion">Data deletion</Link>.
              </li>
              <li>
                Request removal of media containing your likeness — see{" "}
                <Link href="/likeness-removal">Likeness removal</Link>.
              </li>
              <li>
                Report a copyright concern about content on the service — see{" "}
                <Link href="/copyright">Copyright</Link>.
              </li>
              <li>
                Disconnect or delete a stored provider credential at any time from your
                account settings.
              </li>
            </ul>
          </section>

          <section>
            <h2>10. Children&apos;s privacy</h2>
            <p>
              Clippn is not directed at children and we do not knowingly collect
              information from anyone under the age required by their local law to
              consent to this kind of service on their own. If you believe a child has
              created an account, contact us through <Link href="/support">Support</Link>{" "}
              and we&apos;ll remove it.
            </p>
          </section>

          <section>
            <h2>11. Changes to this policy</h2>
            <p>
              If we change this policy in a material way, we&apos;ll update the date at
              the top of this page. Continued use of the service after a change means
              you accept the revised policy.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              Questions about this policy can go to{" "}
              <a href="mailto:privacy@clippn.app">privacy@clippn.app</a>.
            </p>
          </section>
        </LegalPage>
      </main>
      <SiteFooter />
    </div>
  );
}

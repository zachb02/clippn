import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Hero } from "@/components/marketing/hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { WorkflowGrid } from "@/components/marketing/workflow-grid";
import { ToolTeaser } from "@/components/marketing/tool-teaser";
import { ModeExplainer } from "@/components/marketing/mode-explainer";
import { PrivacySection } from "@/components/marketing/privacy-section";
import { Faq } from "@/components/marketing/faq";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <HowItWorks />
        <WorkflowGrid />
        <ToolTeaser />
        <ModeExplainer />
        <PrivacySection />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}

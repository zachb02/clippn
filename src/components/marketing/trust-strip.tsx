import { Key, HardDrives, CreditCard } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "./reveal";

const ITEMS = [
  { icon: Key, label: "Bring your own AI key" },
  { icon: HardDrives, label: "Or process everything locally" },
  { icon: CreditCard, label: "No credit card, ever" },
];

export function TrustStrip() {
  return (
    <Reveal>
      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-3 px-6 py-6">
              <Icon className="size-5 text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

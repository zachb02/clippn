import Link from "next/link";

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/tools", label: "Tools" },
      { href: "/templates", label: "Templates" },
    ],
  },
  {
    title: "Company",
    links: [{ href: "/support", label: "Support" }],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/acceptable-use", label: "Acceptable use" },
      { href: "/copyright", label: "Copyright" },
      { href: "/likeness-removal", label: "Likeness removal" },
      { href: "/data-deletion", label: "Data deletion" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                C
              </span>
              <span className="font-heading text-lg font-bold tracking-tight">Clippn</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              No paywall. No credits. No watermark. Every export, every feature, available
              to every account.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Clippn. All rights reserved.</p>
          <p>Independent product. Not affiliated with any AI provider.</p>
        </div>
      </div>
    </footer>
  );
}

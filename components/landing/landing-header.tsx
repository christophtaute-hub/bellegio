import Link from "next/link";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#kind", label: "Kind" },
  { href: "/#team", label: "Personal" },
  { href: "/#bundeslaender", label: "Bundesländer" },
  { href: "/#einblicke", label: "Einblicke" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="font-heading text-xl font-semibold text-primary">
          Bellegio
        </Link>
        <nav className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
            Anmelden
          </Button>
          <Button shape="pill" size="sm" nativeButton={false} render={<Link href="/#kontakt" />}>
            Demo anfragen
          </Button>
        </div>
      </div>
    </header>
  );
}

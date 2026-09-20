import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} Bellegio · Kita-Controlling für Bayern, Baden-Württemberg und Nordrhein-Westfalen</span>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-foreground">
            AGB
          </Link>
          <Link href="/tom" className="hover:text-foreground">
            Sicherheit
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Anmelden
          </Link>
        </nav>
      </div>
    </footer>
  );
}

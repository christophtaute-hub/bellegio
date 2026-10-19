import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Button } from "@/components/ui/button";

/** Marketing-Ampel: eigener Bereich ohne Einrichtungs-Kontext (wie die Betreiber-Zentrale). Für alle ohne Marketing-Recht
 * existiert er nicht (404). Bestehende Bereiche der App bleiben unberührt. */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  if ((await getMarketingZugriff()) === "kein_zugriff") notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/5 bg-background/80 px-4 py-2.5 backdrop-blur md:px-8">
        <Link href="/marketing" className="font-heading text-lg text-primary">
          Bellegio <span className="text-muted-foreground">· Marketing-Ampel</span>
        </Link>
        <MarketingNav />
        <div className="flex-1" />
        <Button variant="ghost" size="xs" nativeButton={false} render={<Link href="/einrichtung-auswahl" />} className="gap-1 text-muted-foreground">
          <ArrowLeft className="size-3.5" />
          Zur App
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="xs" className="text-muted-foreground">
            Abmelden
          </Button>
        </form>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">{children}</main>
    </div>
  );
}

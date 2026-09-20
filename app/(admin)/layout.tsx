import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isPlatformOperator } from "@/lib/server/current-user-role";
import { getMfaStatus } from "@/lib/server/mfa";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Für Nicht-Betreiber soll der Bereich gar nicht erst existieren.
  if (!(await isPlatformOperator())) notFound();

  // Hat der Betreiber einen zweiten Faktor eingerichtet, kommt er nur mit bestätigtem Code hinein.
  const mfa = await getMfaStatus();
  if (mfa === "code_erforderlich") redirect("/mfa?weiter=/admin");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/5 bg-background/80 px-4 py-2.5 backdrop-blur md:px-8">
        <Link href="/admin" className="font-heading text-lg text-primary">
          Bellegio <span className="text-muted-foreground">· Betreiber-Zentrale</span>
        </Link>
        <AdminNav />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="xs"
          nativeButton={false}
          render={<Link href="/einrichtung-auswahl" />}
          className="gap-1 text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Zur App
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {mfa === "nicht_eingerichtet" ? (
          <div className="rounded-xl border border-accent bg-accent/10 p-4 text-sm print:hidden">
            Dieser Bereich zeigt Umsatz und Kundendaten. Sichere dein Konto zusätzlich mit der{" "}
            <Link href="/einstellungen/profil" className="text-primary underline underline-offset-2">
              Zwei-Faktor-Anmeldung
            </Link>
            .
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setzeRechnungBezahlt, storniereRechnung } from "@/lib/actions/admin";

export function RechnungAktionen({
  rechnungId,
  status,
  darfStornieren,
  heute,
  nurDrucken = false,
}: {
  rechnungId: string;
  status: string;
  darfStornieren: boolean;
  heute: string;
  nurDrucken?: boolean;
}) {
  const router = useRouter();
  const [bezahltAm, setBezahltAm] = useState(heute);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ausfuehren(aktion: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await aktion();
    } catch (err) {
      if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
      else if (!(err instanceof Error)) throw err;
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          Als PDF speichern / drucken
        </Button>
        {!nurDrucken && status === "versendet" ? (
          <>
            <Input type="date" value={bezahltAm} onChange={(e) => setBezahltAm(e.target.value)} className="h-8 w-40" />
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => ausfuehren(async () => { await setzeRechnungBezahlt(rechnungId, bezahltAm); router.refresh(); })}
            >
              Als bezahlt markieren
            </Button>
          </>
        ) : null}
        {!nurDrucken && darfStornieren && (status === "versendet" || status === "bezahlt") ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-destructive"
            onClick={() =>
              ausfuehren(async () => {
                if (!window.confirm("Rechnung stornieren? Es entsteht ein Gutschrift-Entwurf; die Rechnung zählt danach nicht mehr als Einnahme.")) return;
                await storniereRechnung(rechnungId);
              })
            }
          >
            Stornieren
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

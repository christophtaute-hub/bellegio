"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { stimmeZu } from "@/lib/actions/zustimmung";
import { DOKUMENTE } from "@/lib/rechtstexte/version";

export function ZustimmungForm() {
  const router = useRouter();
  const [haken, setHaken] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alle = DOKUMENTE.every((d) => haken[d.key]);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const ergebnis = await stimmeZu();
        setPending(false);
        if (!ergebnis.ok) {
          setError(ergebnis.error);
          return;
        }
        router.push("/einrichtung-auswahl");
        router.refresh();
      }}
    >
      <ul className="flex flex-col gap-3">
        {DOKUMENTE.map((d) => (
          <li key={d.key}>
            <label className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
              <input type="checkbox" className="mt-0.5" checked={Boolean(haken[d.key])} onChange={(e) => setHaken((h) => ({ ...h, [d.key]: e.target.checked }))} />
              <span>
                Ich habe die{" "}
                <Link href={d.href} target="_blank" className="text-primary underline">
                  {d.label}
                </Link>{" "}
                (Version {d.version}) gelesen und stimme für meinen Träger zu.
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Mit deiner Zustimmung erklärst du, dass du berechtigt bist, den Träger zu vertreten. Zeitpunkt und Version werden gespeichert.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={!alle || pending} className="w-fit">
        {pending ? "Speichern…" : "Zustimmen und weiter"}
      </Button>
    </form>
  );
}

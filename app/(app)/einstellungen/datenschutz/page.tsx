import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getCurrentUserRole } from "@/lib/server/current-user-role";
import { ermittleFaellige, istAnonymisiert, type LoeschKandidat } from "@/lib/datenschutz/loeschfrist";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";
import { LoeschfristForm } from "@/components/datenschutz/loeschfrist-form";
import { Badge } from "@/components/ui/badge";

export default async function DatenschutzEinstellungenPage() {
  if ((await getCurrentUserRole()) !== "traeger_admin") notFound();
  const einrichtungId = await getActiveEinrichtungId();
  if (!einrichtungId) notFound();
  const supabase = await createClient();
  const heute = toIsoDateString(new Date());

  const [{ data: einrichtung }, { data: kinder }, { data: team }, { data: protokoll }, { data: einrichtungen }] = await Promise.all([
    supabase.from("einrichtungen").select("name, loeschfrist_monate").eq("id", einrichtungId).single(),
    supabase
      .from("kinder")
      .select("id, vorname, nachname, austritt")
      .eq("einrichtung_id", einrichtungId)
      .not("austritt", "is", null)
      .lte("austritt", heute)
      .is("archived_at", null)
      .limit(2000),
    supabase
      .from("team")
      .select("id, vorname, nachname, austritt")
      .eq("einrichtung_id", einrichtungId)
      .not("austritt", "is", null)
      .lte("austritt", heute)
      .is("archived_at", null)
      .limit(2000),
    supabase.from("loeschprotokoll").select("id, zeitpunkt, art, aktion, einrichtung_id, durch").order("zeitpunkt", { ascending: false }).limit(50),
    supabase.from("einrichtungen").select("id, name"),
  ]);

  const durchIds = Array.from(new Set((protokoll ?? []).map((p) => p.durch).filter((id): id is string => Boolean(id))));
  const { data: personen } = durchIds.length > 0 ? await supabase.from("user_profiles").select("id, full_name, email").in("id", durchIds) : { data: [] };

  const kandidaten: LoeschKandidat[] = [
    ...(kinder ?? []).map((k) => ({
      id: k.id,
      art: "kind" as const,
      name: `${k.vorname} ${k.nachname}`,
      austritt: k.austritt as string,
      anonymisiert: istAnonymisiert("kind", k.vorname, k.nachname),
    })),
    ...(team ?? []).map((t) => ({
      id: t.id,
      art: "team" as const,
      name: `${t.vorname ?? ""} ${t.nachname ?? ""}`.trim(),
      austritt: t.austritt as string,
      anonymisiert: istAnonymisiert("team", t.vorname, t.nachname),
    })),
  ];
  const faellig = ermittleFaellige(kandidaten, einrichtung?.loeschfrist_monate ?? null, heute);
  const einrichtungName = (id: string | null) => (einrichtungen ?? []).find((e) => e.id === id)?.name ?? "gelöschte Einrichtung";
  const personName = (id: string | null) => {
    const p = (personen ?? []).find((x) => x.id === id);
    return p?.full_name ?? p?.email ?? "—";
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/einstellungen" className="text-sm text-muted-foreground hover:text-foreground">
          ← Einrichtungs-Einstellungen
        </Link>
        <h1 className="font-heading text-3xl tracking-tight text-primary">Datenschutz</h1>
        <p className="text-sm text-muted-foreground">
          Löschfrist, Löschprotokoll und Hinweise für {einrichtung?.name}. Löschen und Anonymisieren machst du direkt am Kind bzw. an der Person.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Löschfrist</h2>
        <LoeschfristForm einrichtungId={einrichtungId} initial={einrichtung?.loeschfrist_monate ?? null} />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <h2 className="font-heading text-lg text-primary">Zur Prüfung fällig</h2>
        {einrichtung?.loeschfrist_monate == null ? (
          <p className="text-sm text-muted-foreground">Ohne Löschfrist gibt es keine Erinnerung. Trage oben eine Frist ein.</p>
        ) : faellig.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nichts fällig — kein Austritt liegt länger als {einrichtung.loeschfrist_monate} Monate zurück.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {faellig.map((k) => (
              <li key={`${k.art}-${k.id}`} className="flex items-center gap-3 py-2 text-sm">
                <Badge variant="secondary">{k.art === "kind" ? "Kind" : "Personal"}</Badge>
                <Link href={k.art === "kind" ? `/kinder/${k.id}` : `/team/${k.id}`} className="font-medium underline-offset-2 hover:underline">
                  {k.name}
                </Link>
                <span className="ml-auto text-muted-foreground">Austritt {formatDate(k.austritt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <h2 className="font-heading text-lg text-primary">Löschprotokoll</h2>
        <p className="text-sm text-muted-foreground">Wer wann welchen Datensatz gelöscht oder anonymisiert hat — ohne Namen der betroffenen Personen.</p>
        {(protokoll ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {(protokoll ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="tabular-nums">{new Date(p.zeitpunkt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</span>
                <Badge variant="outline">{p.aktion === "geloescht" ? "Gelöscht" : "Anonymisiert"}</Badge>
                <span>{p.art === "kind" ? "Kind" : "Personal"}</span>
                <span className="text-muted-foreground">{einrichtungName(p.einrichtung_id)} · durch {personName(p.durch)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

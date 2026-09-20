import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getCurrentUserRole, getZugriff, type Bereich, type Zugriff } from "@/lib/server/current-user-role";
import { VollzeitWochenstundenEditor } from "@/components/team/vollzeit-wochenstunden-editor";
import { EmpfohlenerSchluesselEditor } from "@/components/team/empfohlener-schluessel-editor";
import { RechteMatrix } from "@/components/einstellungen/rechte-matrix";
import { NutzerEinladenForm } from "@/components/einstellungen/nutzer-einladen-form";
import { GrunddatenEditor } from "@/components/einrichtung/grunddaten-editor";
import { EinrichtungenVerwalten } from "@/components/einrichtung/einrichtungen-verwalten";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";

const ALLE_BEREICHE: Bereich[] = ["belegung", "personal", "controlling", "szenario"];

async function ladeEinrichtungenFuerVerwaltung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tragerId: string
) {
  const { data } = await supabase
    .from("einrichtungen")
    .select("id, name, address_city, bundesland_code")
    .eq("trager_id", tragerId)
    .is("archived_at", null)
    .order("name");
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    ort: e.address_city,
    bundeslandLabel: BUNDESLAENDER.find((b) => b.code === e.bundesland_code)?.label ?? e.bundesland_code,
  }));
}

export default async function EinstellungenPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  const role = await getCurrentUserRole();
  const canEdit = role === "traeger_admin";

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select(
          "name, address_street, address_city, address_zip, kita_year_start_month, bundesland_code, vollzeit_wochenstunden, empfohlener_anstellungsschluessel, standort_gemeinde, auswaertigen_quote_prozent"
        )
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: eigenesProfil } = authUser
    ? await supabase
        .from("user_profiles")
        .select("id, trager_id, role, kann_rechte_verwalten")
        .eq("id", authUser.id)
        .single()
    : { data: null };

  const istTraegerAdmin = eigenesProfil?.role === "traeger_admin";
  const darfRechteVerwalten =
    istTraegerAdmin || Boolean(eigenesProfil?.kann_rechte_verwalten);

  let rechteVerwaltungDaten: {
    einrichtungen: { id: string; name: string }[];
    users: {
      id: string;
      email: string | null;
      full_name: string | null;
      role: string;
      kann_rechte_verwalten: boolean;
    }[];
    berechtigungen: {
      user_id: string;
      einrichtung_id: string;
      bereich: string;
      zugriff: string;
    }[];
    eigeneZugriffe: Record<string, Record<Bereich, Zugriff>>;
  } | null = null;

  if (eigenesProfil && darfRechteVerwalten) {
    const [{ data: alleEinrichtungen }, { data: alleUsers }, { data: alleBerechtigungen }] =
      await Promise.all([
        supabase
          .from("einrichtungen")
          .select("id, name")
          .eq("trager_id", eigenesProfil.trager_id)
          .is("archived_at", null)
          .order("name"),
        supabase
          .from("user_profiles")
          .select("id, email, full_name, role, kann_rechte_verwalten")
          .eq("trager_id", eigenesProfil.trager_id)
          .order("full_name"),
        supabase
          .from("einrichtung_berechtigungen")
          .select("user_id, einrichtung_id, bereich, zugriff"),
      ]);

    const einrichtungenListe = alleEinrichtungen ?? [];
    const eigeneZugriffe: Record<string, Record<Bereich, Zugriff>> = {};
    if (!istTraegerAdmin) {
      for (const e of einrichtungenListe) {
        eigeneZugriffe[e.id] = {} as Record<Bereich, Zugriff>;
        for (const bereich of ALLE_BEREICHE) {
          eigeneZugriffe[e.id][bereich] = await getZugriff(supabase, e.id, bereich);
        }
      }
    }

    rechteVerwaltungDaten = {
      einrichtungen: einrichtungenListe,
      users: alleUsers ?? [],
      berechtigungen: alleBerechtigungen ?? [],
      eigeneZugriffe,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Einrichtungs-Einstellungen
        </h1>
        <div className="flex items-center gap-4">
          {istTraegerAdmin ? (
            <a href="/einstellungen/datenschutz" className="text-sm text-primary underline-offset-2 hover:underline">
              Datenschutz →
            </a>
          ) : null}
          <a
            href="/einstellungen/profil"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Mein Profil →
          </a>
        </div>
      </div>

      {einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Einrichtung</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Grunddaten der Einrichtung — sichtbar u.a. in Header, Startseite
            und Dokumentation.
          </p>
          <GrunddatenEditor
            einrichtungId={einrichtungId}
            grunddaten={{
              name: einrichtung.name,
              address_street: einrichtung.address_street,
              address_city: einrichtung.address_city,
              address_zip: einrichtung.address_zip,
              kita_year_start_month: einrichtung.kita_year_start_month,
              standort_gemeinde: einrichtung.standort_gemeinde,
              auswaertigen_quote_prozent: einrichtung.auswaertigen_quote_prozent,
            }}
            bundeslandCode={einrichtung.bundesland_code}
            canEdit={canEdit}
          />
        </section>
      ) : null}

      {einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">
            Personalbemessung
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Diese Werte fließen in die Anstellungsschlüssel-Berechnung auf
            Dashboard, Team, Controlling und Szenario-Rechner ein.
          </p>
          <div className="flex flex-col gap-3">
            <VollzeitWochenstundenEditor
              einrichtungId={einrichtungId}
              vollzeitWochenstunden={Number(einrichtung.vollzeit_wochenstunden)}
              canEdit={canEdit}
            />
            <EmpfohlenerSchluesselEditor
              einrichtungId={einrichtungId}
              empfohlenerSchluessel={Number(
                einrichtung.empfohlener_anstellungsschluessel
              )}
              canEdit={canEdit}
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Einrichtung ausgewählt.
        </p>
      )}

      {istTraegerAdmin && einrichtungId && rechteVerwaltungDaten ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Einrichtungen des Trägers</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Weitere Einrichtungen anlegen oder nicht mehr genutzte archivieren. Archivierte Einrichtungen verschwinden
            aus der Auswahl, ihre Daten bleiben erhalten.
          </p>
          <EinrichtungenVerwalten
            aktiveId={einrichtungId}
            einrichtungen={await ladeEinrichtungenFuerVerwaltung(supabase, eigenesProfil!.trager_id)}
          />
        </section>
      ) : null}

      {rechteVerwaltungDaten ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg text-primary">
              Nutzer &amp; Rechte
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Wer sieht welche Einrichtung, und wer darf in welchem Bereich
              bearbeiten? Träger-Admin und Einrichtungsleitung haben immer
              vollen Zugriff. Wer selbst Rechte vergeben darf, kann anderen
              nie mehr geben, als er selbst hat.
            </p>
          </div>

          {istTraegerAdmin ? <NutzerEinladenForm /> : null}

          <RechteMatrix
            currentUserId={eigenesProfil!.id}
            istTraegerAdmin={istTraegerAdmin}
            einrichtungen={rechteVerwaltungDaten.einrichtungen}
            users={rechteVerwaltungDaten.users}
            berechtigungen={rechteVerwaltungDaten.berechtigungen}
            eigeneZugriffe={rechteVerwaltungDaten.eigeneZugriffe}
          />
        </section>
      ) : null}
    </div>
  );
}

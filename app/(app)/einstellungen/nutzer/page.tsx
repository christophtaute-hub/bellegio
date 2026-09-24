import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getZugriff, type Bereich, type Zugriff } from "@/lib/server/current-user-role";
import { RechteMatrix } from "@/components/einstellungen/rechte-matrix";
import { NutzerAnlegenForm } from "@/components/einstellungen/nutzer-anlegen-form";

const ALLE_BEREICHE: Bereich[] = ["belegung", "personal", "controlling", "szenario"];

/** Eigener Bereich "Nutzer & Rechte", unabhängig vom Menüpunkt "Einrichtung" (/einstellungen) —
 * dort geht es nur noch um Einrichtungs-/Trägerstammdaten. */
export default async function NutzerUndRechtePage() {
  const supabase = await createClient();

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
  const kannRechteVerwaltenTraegerweit = Boolean(eigenesProfil?.kann_rechte_verwalten);

  const { data: lokaleAdminZeilenEigene } = eigenesProfil && !istTraegerAdmin
    ? await supabase.from("einrichtung_lokale_admins").select("einrichtung_id").eq("user_id", eigenesProfil.id)
    : { data: null };
  const eigeneLokalAdminIds = new Set((lokaleAdminZeilenEigene ?? []).map((r) => r.einrichtung_id));

  const darfRechteVerwalten = istTraegerAdmin || kannRechteVerwaltenTraegerweit || eigeneLokalAdminIds.size > 0;

  if (!eigenesProfil || !darfRechteVerwalten) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Nutzer &amp; Rechte</h1>
        <p className="text-sm text-muted-foreground">Für diesen Bereich hast du keinen Zugriff.</p>
      </div>
    );
  }

  const [{ data: alleEinrichtungen }, { data: alleUsers }, { data: alleBerechtigungen }, { data: alleLokalenAdmins }] = await Promise.all([
    supabase
      .from("einrichtungen")
      .select("id, name")
      .eq("trager_id", eigenesProfil.trager_id)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("user_profiles")
      .select("id, email, full_name, role, kann_rechte_verwalten, ist_demo")
      .eq("trager_id", eigenesProfil.trager_id)
      .order("full_name"),
    supabase.from("einrichtung_berechtigungen").select("user_id, einrichtung_id, bereich, zugriff"),
    supabase.from("einrichtung_lokale_admins").select("user_id, einrichtung_id"),
  ]);

  // Eine lokale Administration (nicht trägerweit kann_rechte_verwalten) sieht und bearbeitet nur
  // ihre eigene(n) Einrichtung(en) — nicht die ganze Trägerstruktur.
  const sichtbareEinrichtungen =
    istTraegerAdmin || kannRechteVerwaltenTraegerweit
      ? alleEinrichtungen ?? []
      : (alleEinrichtungen ?? []).filter((e) => eigeneLokalAdminIds.has(e.id));

  const eigeneZugriffe: Record<string, Record<Bereich, Zugriff>> = {};
  if (!istTraegerAdmin) {
    for (const e of sichtbareEinrichtungen) {
      eigeneZugriffe[e.id] = {} as Record<Bereich, Zugriff>;
      for (const bereich of ALLE_BEREICHE) {
        eigeneZugriffe[e.id][bereich] = await getZugriff(supabase, e.id, bereich);
      }
    }
  }

  // Sperrstatus kommt aus Supabase Auth (banned_until), nicht aus user_profiles — nur der
  // Träger-Admin sieht diese Seite, deshalb ist der Service-Role-Zugriff hier vertretbar.
  const gesperrteIds = new Set<string>();
  if (istTraegerAdmin && (alleUsers ?? []).length > 0) {
    try {
      const admin = createServiceRoleClient();
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const heute = new Date();
      for (const authUser of data?.users ?? []) {
        if (authUser.banned_until && new Date(authUser.banned_until) > heute) {
          gesperrteIds.add(authUser.id);
        }
      }
    } catch {
      // Sperrstatus ist eine reine Anzeige-Ergänzung — bei einem Fehler bleibt die Seite trotzdem nutzbar.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Nutzer &amp; Rechte</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Wer sieht welche Einrichtung, und wer darf in welchem Bereich bearbeiten? Träger-Admin und
          Einrichtungsleitung haben immer vollen Zugriff. Wer selbst Rechte vergeben darf, kann anderen nie mehr
          geben, als er selbst hat.
        </p>
      </div>

      {istTraegerAdmin ? (
        <NutzerAnlegenForm einrichtungen={sichtbareEinrichtungen} />
      ) : eigeneLokalAdminIds.size > 0 ? (
        <NutzerAnlegenForm einrichtungen={sichtbareEinrichtungen} nurMitarbeiter />
      ) : null}

      <RechteMatrix
        currentUserId={eigenesProfil.id}
        istTraegerAdmin={istTraegerAdmin}
        einrichtungen={sichtbareEinrichtungen}
        users={(alleUsers ?? []).map((u) => ({ ...u, gesperrt: gesperrteIds.has(u.id) }))}
        berechtigungen={alleBerechtigungen ?? []}
        eigeneZugriffe={eigeneZugriffe}
        lokaleAdmins={alleLokalenAdmins ?? []}
      />
    </div>
  );
}

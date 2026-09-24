"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { pruefePasswort } from "@/lib/passwort";
import type { Bereich, Zugriff } from "@/lib/server/current-user-role";
import {
  darfNutzerVerwalten,
  pruefeNeuenNutzer,
  zugriffRang,
  type NeueRolle,
  type NeuerNutzerInput,
  type Verwaltungsaktion,
} from "@/lib/nutzer/verwaltung";
import { getZugriff } from "@/lib/server/current-user-role";
import { mitZeitlimit, ZeitlimitFehler } from "@/lib/supabase/mit-zeitlimit";

export type NutzerErgebnis = { ok: true } | { ok: false; error: string };

const NICHT_ERLAUBT = "Keine Berechtigung für diese Aktion.";
const ZEITLIMIT_MELDUNG = "Die Verbindung hat zu lange gedauert. Bitte Internetverbindung prüfen und erneut versuchen.";
const UNERWARTETER_FEHLER = "Unerwarteter Fehler. Bitte erneut versuchen.";

/** Verwandelt eine geworfene Ausnahme in eine deutsche Fehlermeldung statt sie durchzureichen — eine Server
 * Action, die wirft statt {ok:false} zurückzugeben, lässt den aufrufenden Button sonst für immer im
 * „lädt…“-Zustand hängen (kein try/catch auf der Client-Seite fängt das ab, siehe NutzerAnlegenForm).
 * Protokolliert die eigentliche Ausnahme serverseitig (Terminal/`preview_logs`) — die Meldung an den Client
 * bleibt bewusst allgemein, sonst wäre ein Fehler sonst nirgends mehr nachvollziehbar. */
function alsErgebnis(kontext: string, fehler: unknown): NutzerErgebnis {
  console.error(`[berechtigungen:${kontext}]`, fehler);
  if (fehler instanceof ZeitlimitFehler) return { ok: false, error: ZEITLIMIT_MELDUNG };
  return { ok: false, error: UNERWARTETER_FEHLER };
}

async function aktuellerAufrufer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase
    .from("user_profiles")
    .select("id, trager_id, role, kann_rechte_verwalten")
    .eq("id", user.id)
    .single();
  if (!profil) return null;
  return { supabase, id: profil.id, rolle: profil.role, tragerId: profil.trager_id, kannRechteVerwalten: profil.kann_rechte_verwalten };
}

/** Lädt den Ziel-Nutzer mit Service-Role und prüft die Berechtigung des Aufrufers, bevor irgendetwas geschieht. */
async function zielPruefen(zielId: string, aktion: Verwaltungsaktion) {
  const aufrufer = await aktuellerAufrufer();
  if (!aufrufer) return { ok: false as const, error: "Nicht angemeldet." };
  const admin = createServiceRoleClient();
  const { data: ziel } = await admin.from("user_profiles").select("id, trager_id, role").eq("id", zielId).maybeSingle();
  if (!ziel) return { ok: false as const, error: "Nutzer nicht gefunden." };
  const fehler = darfNutzerVerwalten(
    { id: aufrufer.id, rolle: aufrufer.rolle, tragerId: aufrufer.tragerId },
    { id: ziel.id, rolle: ziel.role, tragerId: ziel.trager_id },
    aktion
  );
  if (fehler) return { ok: false as const, error: fehler };
  return { ok: true as const, admin, aufrufer };
}

export async function setEinrichtungBerechtigung(
  userId: string,
  einrichtungId: string,
  bereich: Bereich,
  zugriff: Zugriff
): Promise<NutzerErgebnis> {
  try {
    const supabase = await createClient();
    // Die Datenbank erlaubt das nur der Träger-Administration und Personen mit Recht zur Rechte-Verwaltung — und nie mehr
    // Rechte, als der Vergebende selbst hat.
    const { error } = await supabase.from("einrichtung_berechtigungen").upsert(
      { user_id: userId, einrichtung_id: einrichtungId, bereich, zugriff, updated_at: new Date().toISOString() },
      { onConflict: "user_id,einrichtung_id,bereich" }
    );
    if (error) return { ok: false, error: NICHT_ERLAUBT };
    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("setEinrichtungBerechtigung", fehler);
  }
}

export async function setKannRechteVerwalten(userId: string, value: boolean): Promise<NutzerErgebnis> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("user_profiles").update({ kann_rechte_verwalten: value }).eq("id", userId);
    if (error) return { ok: false, error: NICHT_ERLAUBT };
    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("setKannRechteVerwalten", fehler);
  }
}

/** Macht einen Nutzer zum lokalen Admin einer einzelnen Einrichtung (darf dort Rechte vergeben,
 * ohne trägerweiten Zugriff zu bekommen) oder nimmt das wieder zurück. Nur die Träger-
 * Administration darf das (durchgesetzt über RLS auf einrichtung_lokale_admins). */
export async function setLokalerAdmin(userId: string, einrichtungId: string, value: boolean): Promise<NutzerErgebnis> {
  try {
    const supabase = await createClient();
    if (value) {
      const { error } = await supabase.from("einrichtung_lokale_admins").insert({ user_id: userId, einrichtung_id: einrichtungId });
      if (error) return { ok: false, error: NICHT_ERLAUBT };
    } else {
      const { error } = await supabase.from("einrichtung_lokale_admins").delete().eq("user_id", userId).eq("einrichtung_id", einrichtungId);
      if (error) return { ok: false, error: NICHT_ERLAUBT };
    }
    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("setLokalerAdmin", fehler);
  }
}

/** Legt einen Nutzer an — mit sofort nutzbarem Passwort oder per Einladungs-Mail — samt Rolle und Rechten. */
export async function legeNutzerAn(input: NeuerNutzerInput): Promise<NutzerErgebnis> {
  try {
    const aufrufer = await aktuellerAufrufer();
    if (!aufrufer) return { ok: false, error: "Nicht angemeldet." };
    const istTraegerAdmin = aufrufer.rolle === "traeger_admin";

    // Wer nicht Träger-Admin ist, darf nur als lokale Administration anlegen: nur Mitarbeiter,
    // nur für die eigene(n) Einrichtung(en), nie mit mehr Rechten, als man selbst dort hat.
    if (!istTraegerAdmin) {
      const { data: lokal } = await aufrufer.supabase.from("einrichtung_lokale_admins").select("einrichtung_id").eq("user_id", aufrufer.id);
      const lokalAdminIds = new Set((lokal ?? []).map((r) => r.einrichtung_id));
      if (lokalAdminIds.size === 0) return { ok: false, error: "Du darfst keine Nutzer anlegen." };
      if (input.rolle !== "mitarbeiter") return { ok: false, error: "Als lokale Administration kannst du nur Mitarbeiter mit Rechten für deine eigene(n) Einrichtung(en) anlegen." };
      if (input.einrichtungIds.length === 0 || input.einrichtungIds.some((id) => !lokalAdminIds.has(id))) {
        return { ok: false, error: "Du kannst Rechte nur für deine eigene(n) Einrichtung(en) vergeben." };
      }
      for (const einrichtungId of input.einrichtungIds) {
        for (const [bereich, zugriff] of Object.entries(input.rechte) as [Bereich, Zugriff][]) {
          const eigenerZugriff = await getZugriff(aufrufer.supabase, einrichtungId, bereich);
          if (zugriffRang(zugriff) > zugriffRang(eigenerZugriff)) {
            return { ok: false, error: "Du kannst keine höheren Rechte vergeben, als du selbst hast." };
          }
        }
      }
    }

    const fehler = pruefeNeuenNutzer(input);
    if (fehler) return { ok: false, error: fehler };

    // Nur Einrichtungen des eigenen Trägers (RLS liefert nur diese).
    const { data: eigene } = await aufrufer.supabase.from("einrichtungen").select("id").in("id", input.einrichtungIds.length ? input.einrichtungIds : ["00000000-0000-0000-0000-000000000000"]);
    const erlaubteIds = new Set((eigene ?? []).map((e) => e.id));
    if (input.einrichtungIds.some((id) => !erlaubteIds.has(id))) return { ok: false, error: "Eine der gewählten Einrichtungen gehört nicht zu deinem Träger." };

    const admin = createServiceRoleClient();
    const email = input.email.trim().toLowerCase();
    let angelegt: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["data"];
    let createError: Awaited<ReturnType<typeof admin.auth.admin.createUser>>["error"];
    try {
      const ergebnis = input.passwort
        ? await mitZeitlimit(admin.auth.admin.createUser({ email, password: input.passwort, email_confirm: true }))
        : await mitZeitlimit(admin.auth.admin.inviteUserByEmail(email));
      angelegt = ergebnis.data;
      createError = ergebnis.error;
    } catch (netzwerkFehler) {
      return alsErgebnis("legeNutzerAn:createUser", netzwerkFehler);
    }
    if (createError || !angelegt.user) {
      const meldung = createError?.message ?? "";
      return { ok: false, error: /already been registered|already exists/i.test(meldung) ? "Diese E-Mail-Adresse ist bereits vergeben." : "Der Nutzer konnte nicht angelegt werden." };
    }

    const aufraeumen = async () => {
      await admin.from("user_profiles").delete().eq("id", angelegt.user.id);
      await admin.auth.admin.deleteUser(angelegt.user.id).catch(() => {});
    };

    const { error: profilError } = await admin.from("user_profiles").insert({
      id: angelegt.user.id,
      email,
      full_name: input.name.trim(),
      role: input.rolle,
      trager_id: aufrufer.tragerId,
      kann_rechte_verwalten: false,
    });
    if (profilError) {
      await aufraeumen();
      return { ok: false, error: "Der Nutzer konnte nicht angelegt werden." };
    }

    if (input.rolle === "mitarbeiter" && input.einrichtungIds.length > 0) {
      const zeilen = input.einrichtungIds.flatMap((einrichtungId) =>
        (Object.entries(input.rechte) as [Bereich, Zugriff][]).map(([bereich, zugriff]) => ({
          user_id: angelegt.user.id,
          einrichtung_id: einrichtungId,
          bereich,
          zugriff,
        }))
      );
      const { error: rechteError } = await admin.from("einrichtung_berechtigungen").insert(zeilen);
      if (rechteError) {
        await aufraeumen();
        return { ok: false, error: "Die Rechte konnten nicht gespeichert werden — der Nutzer wurde nicht angelegt." };
      }
    }

    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("legeNutzerAn", fehler);
  }
}

/** Setzt für einen Nutzer direkt ein neues Passwort (z. B. wenn es vergessen wurde). */
export async function setzeNutzerPasswort(userId: string, passwort: string): Promise<NutzerErgebnis> {
  try {
    const pruefung = await zielPruefen(userId, "passwort");
    if (!pruefung.ok) return pruefung;
    const fehler = pruefePasswort(passwort);
    if (fehler) return { ok: false, error: fehler };
    const { error } = await mitZeitlimit(pruefung.admin.auth.admin.updateUserById(userId, { password: passwort }));
    if (error) return { ok: false, error: "Das Passwort konnte nicht gesetzt werden." };
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("setzeNutzerPasswort", fehler);
  }
}

export async function loescheNutzer(userId: string): Promise<NutzerErgebnis> {
  try {
    const pruefung = await zielPruefen(userId, "loeschen");
    if (!pruefung.ok) return pruefung;
    // Profil und Rechte folgen per Cascade; Einträge in den Änderungsprotokollen verlieren nur den Verweis auf den Nutzer.
    const { error } = await mitZeitlimit(pruefung.admin.auth.admin.deleteUser(userId));
    if (error) return { ok: false, error: "Der Nutzer konnte nicht gelöscht werden." };
    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("loescheNutzer", fehler);
  }
}

// Supabase kennt kein "für immer" — 100 Jahre ist der von der Auth Admin API dokumentierte Weg,
// einen Nutzer bis auf Weiteres zu sperren (entsperren setzt ban_duration wieder auf "none").
const SPERR_DAUER = "876000h";

/** Sperrt einen Nutzer (Login schlägt danach fehl) oder hebt eine Sperre wieder auf — ohne den Nutzer
 * zu löschen, damit seine Daten/Zuordnungen erhalten bleiben. */
export async function sperreNutzer(userId: string, gesperrt: boolean): Promise<NutzerErgebnis> {
  try {
    const pruefung = await zielPruefen(userId, "sperren");
    if (!pruefung.ok) return pruefung;
    const { error } = await mitZeitlimit(
      pruefung.admin.auth.admin.updateUserById(userId, { ban_duration: gesperrt ? SPERR_DAUER : "none" })
    );
    if (error) return { ok: false, error: gesperrt ? "Der Nutzer konnte nicht gesperrt werden." : "Die Sperre konnte nicht aufgehoben werden." };
    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("sperreNutzer", fehler);
  }
}

export async function setzeNutzerRolle(userId: string, rolle: NeueRolle): Promise<NutzerErgebnis> {
  try {
    if (rolle !== "mitarbeiter" && rolle !== "einrichtungsleitung") return { ok: false, error: "Bitte eine Rolle wählen." };
    const pruefung = await zielPruefen(userId, "rolle");
    if (!pruefung.ok) return pruefung;
    const { error } = await pruefung.admin.from("user_profiles").update({ role: rolle }).eq("id", userId);
    if (error) return { ok: false, error: "Die Rolle konnte nicht geändert werden." };
    revalidatePath("/einstellungen/nutzer");
    return { ok: true };
  } catch (fehler) {
    return alsErgebnis("setzeNutzerRolle", fehler);
  }
}

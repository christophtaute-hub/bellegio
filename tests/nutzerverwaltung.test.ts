import { describe, expect, it } from "vitest";
import {
  darfNutzerVerwalten,
  erzeugePasswort,
  gruppiereNachCluster,
  pruefeNeuenNutzer,
  type NeuerNutzerInput,
} from "@/lib/nutzer/verwaltung";
import { pruefePasswort } from "@/lib/passwort";

const admin = { id: "a", rolle: "traeger_admin", tragerId: "t1" };

describe("Nutzer verwalten: wer darf was", () => {
  it("die Träger-Administration darf Mitarbeiter im eigenen Träger verwalten", () => {
    for (const aktion of ["passwort", "loeschen", "rolle", "sperren"] as const) {
      expect(darfNutzerVerwalten(admin, { id: "m", rolle: "mitarbeiter", tragerId: "t1" }, aktion)).toBeNull();
      expect(darfNutzerVerwalten(admin, { id: "l", rolle: "einrichtungsleitung", tragerId: "t1" }, aktion)).toBeNull();
    }
  });

  it("Nutzer eines fremden Trägers sind tabu", () => {
    expect(darfNutzerVerwalten(admin, { id: "x", rolle: "mitarbeiter", tragerId: "t2" }, "passwort")).toMatch(/nicht zu deinem Träger/);
    expect(darfNutzerVerwalten(admin, { id: "x", rolle: "mitarbeiter", tragerId: "t2" }, "loeschen")).toMatch(/nicht zu deinem Träger/);
  });

  it("Mitarbeiter und Einrichtungsleitung dürfen keine Nutzer verwalten", () => {
    const ziel = { id: "m", rolle: "mitarbeiter", tragerId: "t1" };
    expect(darfNutzerVerwalten({ id: "b", rolle: "mitarbeiter", tragerId: "t1" }, ziel, "passwort")).toMatch(/Träger-Administration/);
    expect(darfNutzerVerwalten({ id: "l", rolle: "einrichtungsleitung", tragerId: "t1" }, ziel, "loeschen")).toMatch(/Träger-Administration/);
  });

  it("Träger-Administratoren lassen sich weder löschen noch herabstufen, auch nicht der eigene Zugang", () => {
    const anderer = { id: "b", rolle: "traeger_admin", tragerId: "t1" };
    expect(darfNutzerVerwalten(admin, anderer, "loeschen")).toMatch(/nicht ändern, sperren oder löschen/);
    expect(darfNutzerVerwalten(admin, admin, "loeschen")).toMatch(/nicht ändern, sperren oder löschen/);
    expect(darfNutzerVerwalten(admin, anderer, "rolle")).toMatch(/nicht ändern, sperren oder löschen/);
    expect(darfNutzerVerwalten(admin, anderer, "sperren")).toMatch(/nicht ändern, sperren oder löschen/);
    expect(darfNutzerVerwalten(admin, anderer, "passwort")).toMatch(/Mein Profil/);
  });
});

describe("Neuen Nutzer prüfen", () => {
  const basis: NeuerNutzerInput = {
    email: "kollegin@beispiel.de",
    name: "Erika Muster",
    passwort: "Sonnenblume-2026",
    rolle: "mitarbeiter",
    einrichtungIds: ["e1"],
    rechte: { belegung: "bearbeiten", personal: "kein_zugriff", controlling: "kein_zugriff", szenario: "kein_zugriff", finanzen: "kein_zugriff" },
  };

  it("akzeptiert vollständige Angaben mit Passwort und mit Einladung", () => {
    expect(pruefeNeuenNutzer(basis)).toBeNull();
    expect(pruefeNeuenNutzer({ ...basis, passwort: null })).toBeNull();
  });

  it("verlangt Namen, gültige E-Mail und ein regelkonformes Passwort", () => {
    expect(pruefeNeuenNutzer({ ...basis, name: " " })).toMatch(/Namen/);
    expect(pruefeNeuenNutzer({ ...basis, email: "keine-mail" })).toMatch(/E-Mail/);
    expect(pruefeNeuenNutzer({ ...basis, passwort: "kurz" })).toMatch(/mindestens/);
  });

  it("lehnt unbekannte Rechtestufen ab", () => {
    expect(pruefeNeuenNutzer({ ...basis, rechte: { ...basis.rechte, belegung: "alles" as never } })).toMatch(/Stufe/);
  });
});

describe("Passwort erzeugen", () => {
  it("hat die gewünschte Länge und erfüllt die Passwortregel", () => {
    for (let i = 0; i < 50; i++) {
      const p = erzeugePasswort();
      expect(p).toHaveLength(14);
      expect(pruefePasswort(p)).toBeNull();
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
    }
  });

  it("enthält keine verwechselbaren Zeichen", () => {
    for (let i = 0; i < 50; i++) expect(erzeugePasswort(30)).not.toMatch(/[0OIl1]/);
  });

  it("liefert unterschiedliche Werte", () => {
    expect(new Set(Array.from({ length: 20 }, () => erzeugePasswort())).size).toBe(20);
  });
});

describe("Einrichtungen nach Cluster gruppieren", () => {
  it("gruppiert nach Cluster-Wert und sortiert alphabetisch", () => {
    const gruppen = gruppiereNachCluster([
      { id: "1", cluster: "NRW 1" },
      { id: "2", cluster: "Bayern 1" },
      { id: "3", cluster: "Bayern 1" },
    ]);
    expect(gruppen.map((g) => g.label)).toEqual(["Bayern 1", "NRW 1"]);
    expect(gruppen[0].einrichtungen.map((e) => e.id)).toEqual(["2", "3"]);
  });

  it("sammelt Einrichtungen ohne Cluster (null oder leer) in einer eigenen Gruppe am Ende", () => {
    const gruppen = gruppiereNachCluster([
      { id: "1", cluster: "Bayern 1" },
      { id: "2", cluster: null },
      { id: "3", cluster: "  " },
    ]);
    expect(gruppen.map((g) => g.label)).toEqual(["Bayern 1", "Ohne Cluster"]);
    expect(gruppen[1].einrichtungen.map((e) => e.id)).toEqual(["2", "3"]);
  });

  it("liefert eine einzige Gruppe, wenn kein Cluster gesetzt ist", () => {
    const gruppen = gruppiereNachCluster([{ id: "1", cluster: null }, { id: "2", cluster: null }]);
    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].cluster).toBeNull();
  });

  it("leere Liste ergibt leere Gruppenliste", () => {
    expect(gruppiereNachCluster([])).toEqual([]);
  });
});

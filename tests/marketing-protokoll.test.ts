import { describe, expect, it } from "vitest";
import { beschreibeBewertungsAenderung } from "@/lib/marketing/protokoll";

const name = (id: string) => (id === "u1" ? "Katrin K." : "Unbekannt");

describe("beschreibeBewertungsAenderung", () => {
  it("zeigt Ampelwechsel mit Farbwörtern", () => {
    const z = beschreibeBewertungsAenderung("UPDATE", { ampel_belegung: 1, ampel_personelle_qualitaet: 0 }, { ampel_belegung: 3, ampel_personelle_qualitaet: 2 }, name);
    expect(z).toContain("Belegung: Gelb → Rot");
    expect(z).toContain("Personelle Qualität: Grün → Rot");
  });
  it("erste Bewertung", () => {
    expect(beschreibeBewertungsAenderung("INSERT", null, { ampel_belegung: 2 }, name)).toEqual(["Erste Bewertung angelegt"]);
  });
  it("Zahlen, Regionalleitung und Kommentar; unveränderte Felder fehlen", () => {
    const z = beschreibeBewertungsAenderung(
      "UPDATE",
      { freie_plaetze_u3: 2, regionalleitung_user_id: null, kommentar: "a", ampel_belegung: 2 },
      { freie_plaetze_u3: 5, regionalleitung_user_id: "u1", kommentar: "b", ampel_belegung: 2 },
      name
    );
    expect(z).toEqual(["Freie U3-Plätze: 2 → 5", "Regionalleitung: – → Katrin K.", "Kommentar geändert"]);
  });
  it("unbewertet → bewertet", () => {
    expect(beschreibeBewertungsAenderung("UPDATE", { ampel_belegung: null }, { ampel_belegung: 0 }, name)).toEqual(["Belegung: nicht bewertet → Grün"]);
  });
});

import { beschreibeKampagnenAenderung } from "@/lib/marketing/protokoll";

describe("beschreibeKampagnenAenderung", () => {
  const basis = { kanal: "meta", beworbenes: "6 Ü3-Plätze", status: "geplant", budget: 500, links: [], kommentar: null };
  it("neu angelegt", () => {
    expect(beschreibeKampagnenAenderung("INSERT", null, basis)).toEqual(["Kampagne angelegt: Meta Ads · 6 Ü3-Plätze"]);
  });
  it("Statuswechsel und Budget", () => {
    const z = beschreibeKampagnenAenderung("UPDATE", basis, { ...basis, status: "aktiv", budget: 800 });
    expect(z).toEqual(["Kampagne „Meta Ads · 6 Ü3-Plätze“: Status Geplant → Aktiv", "Kampagne „Meta Ads · 6 Ü3-Plätze“: Budget 500 → 800"]);
  });
  it("Links oder Kommentar: eine Sammelzeile", () => {
    expect(beschreibeKampagnenAenderung("UPDATE", basis, { ...basis, links: ["https://a.de/"] })).toEqual(["Kampagne „Meta Ads · 6 Ü3-Plätze“: weitere Angaben geändert"]);
  });
});

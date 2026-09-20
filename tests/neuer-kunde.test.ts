import { describe, expect, it } from "vitest";
import { istBundeslandCode, pruefeNeuenKunden, type NeuerKundeInput } from "@/lib/admin/neuer-kunde";

const basis: NeuerKundeInput = {
  traegerName: "Sonnenschein e. V.",
  einrichtungName: "Kita Sonnenschein",
  bundeslandCode: "by",
  ort: "München",
  vollzeitWochenstunden: 39,
  adminName: "Erika Muster",
  adminEmail: "erika@sonnenschein.example",
  adminPasswort: null,
  rechnungsanschrift: null,
  rechnungsEmail: null,
};

describe("Neuen Kunden anlegen — Validierung", () => {
  it("akzeptiert vollständige Angaben mit Einladung", () => {
    expect(pruefeNeuenKunden(basis)).toBeNull();
  });

  it("verlangt Namen, Bundesland und eine gültige E-Mail", () => {
    expect(pruefeNeuenKunden({ ...basis, traegerName: " " })).toMatch(/Träger/);
    expect(pruefeNeuenKunden({ ...basis, einrichtungName: "" })).toMatch(/Einrichtung/);
    expect(pruefeNeuenKunden({ ...basis, bundeslandCode: "hh" })).toMatch(/Bundesland/);
    expect(pruefeNeuenKunden({ ...basis, adminName: "" })).toMatch(/Namen/);
    expect(pruefeNeuenKunden({ ...basis, adminEmail: "keine-mail" })).toMatch(/E-Mail/);
    expect(pruefeNeuenKunden({ ...basis, rechnungsEmail: "auch keine" })).toMatch(/Rechnungs-E-Mail/);
  });

  it("begrenzt die Vollzeit-Wochenstunden", () => {
    expect(pruefeNeuenKunden({ ...basis, vollzeitWochenstunden: 0 })).toMatch(/Vollzeit/);
    expect(pruefeNeuenKunden({ ...basis, vollzeitWochenstunden: 61 })).toMatch(/Vollzeit/);
    expect(pruefeNeuenKunden({ ...basis, vollzeitWochenstunden: Number.NaN })).toMatch(/Vollzeit/);
    expect(pruefeNeuenKunden({ ...basis, vollzeitWochenstunden: 40 })).toBeNull();
  });

  it("wendet die Passwortregel auf ein direkt vergebenes Passwort an", () => {
    expect(pruefeNeuenKunden({ ...basis, adminPasswort: "kurz" })).toMatch(/mindestens/);
    expect(pruefeNeuenKunden({ ...basis, adminPasswort: "Startpasswort-2026" })).toBeNull();
  });

  it("erkennt die drei Bundesländer", () => {
    expect(["by", "bw", "nrw"].every(istBundeslandCode)).toBe(true);
    expect(istBundeslandCode("he")).toBe(false);
  });
});
